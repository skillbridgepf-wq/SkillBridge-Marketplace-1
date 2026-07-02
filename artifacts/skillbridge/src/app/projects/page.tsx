'use client';

import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProjectCard from '@/components/ProjectCard';
import { supabase } from '@/lib/supabase/client';
import type { Project, Category } from '@/types/database';
import { Search, SlidersHorizontal, X, Loader2, Briefcase } from 'lucide-react';

const BUDGET_TYPES = [
  { value: '', label: 'All Budget Types' },
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'hourly', label: 'Hourly Rate' },
];

const EXP_LEVELS = [
  { value: '', label: 'All Levels' },
  { value: 'beginner', label: 'Entry Level' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'expert', label: 'Expert' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

function ProjectsContent() {
  const searchParams = useSearchParams();

  const [projects,    setProjects]    = useState<Project[]>([]);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [search,     setSearch]     = useState(searchParams?.get('search')   || '');
  const [category,   setCategory]   = useState(searchParams?.get('category') || '');
  const [budgetType, setBudgetType] = useState(searchParams?.get('budgetType') || '');
  const [expLevel,   setExpLevel]   = useState(searchParams?.get('expLevel') || '');
  const [isRemote,   setIsRemote]   = useState(searchParams?.get('remote') === 'true');
  const [status,     setStatus]     = useState(searchParams?.get('status')   || 'open');

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProjects = useCallback(async (searchVal: string) => {
    setLoading(true);
    let query = supabase
      .from('projects')
      .select('*, profiles(*)')
      .eq('status', status || 'open')
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60);

    if (category)   query = query.eq('category',         category);
    if (budgetType) query = query.eq('budget_type',      budgetType);
    if (expLevel)   query = query.eq('experience_level', expLevel);
    if (isRemote)   query = query.eq('is_remote',        true);

    const { data } = await query;
    let results = (data as Project[]) || [];

    if (searchVal.trim()) {
      const q = searchVal.toLowerCase();
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.skills_required || []).some((s) => s.toLowerCase().includes(q)),
      );
    }

    setProjects(results);
    setLoading(false);
  }, [category, budgetType, expLevel, isRemote, status]);

  // Load categories once
  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  // Re-fetch when structural filters change (instant)
  useEffect(() => {
    fetchProjects(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, budgetType, expLevel, isRemote, status]);

  // Debounce keyword search (400ms)
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchProjects(val);
    }, 400);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchProjects(search);
  };

  const clearFilters = () => {
    setCategory('');
    setBudgetType('');
    setExpLevel('');
    setIsRemote(false);
    setStatus('open');
    setSearch('');
    fetchProjects('');
  };

  const hasFilters = !!(category || budgetType || expLevel || isRemote || status !== 'open' || search);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-4">Browse Projects</h1>
          <form onSubmit={handleSearchSubmit} className="flex gap-3 max-w-2xl">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by title, skill, or keyword..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 gradient-card text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm whitespace-nowrap"
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors md:hidden"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasFilters && <span className="w-2 h-2 rounded-full bg-brand-500" />}
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex gap-8">

          {/* Sidebar Filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} md:block w-60 shrink-0`}>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-24">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-brand-600" />
                  Filters
                </h3>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>

              {/* Status */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Status</h4>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value={opt.value}
                        checked={status === opt.value}
                        onChange={() => setStatus(opt.value)}
                        className="text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Category</h4>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value=""
                        checked={!category}
                        onChange={() => setCategory('')}
                        className="text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700">All Categories</span>
                    </label>
                    {categories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          value={cat.name}
                          checked={category === cat.name}
                          onChange={() => setCategory(cat.name)}
                          className="text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm text-slate-700">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Budget Type */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Budget Type</h4>
                <select
                  value={budgetType}
                  onChange={(e) => setBudgetType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 input-focus bg-white"
                >
                  {BUDGET_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Experience Level */}
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Experience Level</h4>
                <select
                  value={expLevel}
                  onChange={(e) => setExpLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 input-focus bg-white"
                >
                  {EXP_LEVELS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Remote */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRemote}
                    onChange={(e) => setIsRemote(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Remote Only</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Project Grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">
                {loading
                  ? 'Searching…'
                  : `${projects.length} project${projects.length !== 1 ? 's' : ''} found`}
                {hasFilters && !loading && (
                  <button
                    onClick={clearFilters}
                    className="ml-3 text-xs text-brand-600 font-semibold hover:text-brand-700"
                  >
                    Clear filters
                  </button>
                )}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
                    <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-full mb-1" />
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No projects found</h3>
                <p className="text-slate-400 mb-6">Try adjusting your filters or search terms</p>
                <button onClick={clearFilters} className="text-brand-600 font-semibold hover:text-brand-700 text-sm">
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}

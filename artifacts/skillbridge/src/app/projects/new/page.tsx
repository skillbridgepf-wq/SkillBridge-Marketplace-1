'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import type { Category, ProjectInsert, ProjectRow } from '@/types/database';
import { ArrowLeft, Plus, X, AlertCircle, CheckCircle2, Loader2, Briefcase } from 'lucide-react';

const EXP_LEVELS = [
  { value: 'beginner', label: 'Entry Level', desc: 'Looking for someone learning the ropes' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Looking for substantial experience' },
  { value: 'expert', label: 'Expert', desc: 'Looking for comprehensive, expert-level experience' },
];

export default function NewProjectPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [skillInput, setSkillInput] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    budget_type: 'fixed' as 'fixed' | 'hourly',
    budget_min: '',
    budget_max: '',
    skills_required: [] as string[],
    experience_level: 'intermediate' as 'beginner' | 'intermediate' | 'expert',
    is_remote: true,
    deadline: '',
    featured: false,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login?tab=signin');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !form.skills_required.includes(trimmed)) {
      setForm((f) => ({ ...f, skills_required: [...f.skills_required, trimmed] }));
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setForm((f) => ({ ...f, skills_required: f.skills_required.filter((s) => s !== skill) }));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSubmitting(true);

    if (!form.title.trim() || form.title.trim().length < 5) {
      setError('Title must be at least 5 characters.');
      setSubmitting(false);
      return;
    }
    if (!form.description.trim() || form.description.trim().length < 20) {
      setError('Description must be at least 20 characters.');
      setSubmitting(false);
      return;
    }
    if (!form.category) {
      setError('Please select a category.');
      setSubmitting(false);
      return;
    }

    const payload: ProjectInsert = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      budget_type: form.budget_type,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      skills_required: form.skills_required,
      experience_level: form.experience_level,
      is_remote: form.is_remote,
      deadline: form.deadline || null,
      featured: false,
      status: 'open',
      client_id: user.id,
      proposals_count: 0,
    };

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
    } else if (data) {
      const row = data as ProjectRow;
      router.push(`/projects/${row.id}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Post a New Project</h1>
          <p className="text-slate-500">Describe your project and receive proposals from talented freelancers.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-brand-600" />
              Project Information
            </h2>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Project Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Build a responsive e-commerce website with React"
                required
                minLength={5}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus"
              />
              <p className="text-xs text-slate-400 mt-1">{form.title.length}/100 characters</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 text-sm input-focus bg-white"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
                {categories.length === 0 && (
                  <>
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile Development">Mobile Development</option>
                    <option value="Design">Design</option>
                    <option value="Writing">Writing</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Data Science">Data Science</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Other">Other</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={6}
                required
                minLength={20}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe your project in detail. Include goals, deliverables, and any specific requirements..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus resize-none"
              />
              <p className="text-xs text-slate-400 mt-1">{form.description.length} characters (min 20)</p>
            </div>
          </div>

          {/* Budget */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-900">Budget</h2>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Budget Type</label>
              <div className="grid grid-cols-2 gap-3">
                {(['fixed', 'hourly'] as const).map((type) => (
                  <label
                    key={type}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      form.budget_type === type
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="budget_type"
                      value={type}
                      checked={form.budget_type === type}
                      onChange={() => setForm((f) => ({ ...f, budget_type: type }))}
                      className="text-brand-600"
                    />
                    <span className="font-medium capitalize text-sm">{type === 'hourly' ? 'Hourly Rate' : 'Fixed Price'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Min Budget ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.budget_min}
                  onChange={(e) => setForm((f) => ({ ...f, budget_min: e.target.value }))}
                  placeholder="e.g. 500"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Max Budget ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.budget_max}
                  onChange={(e) => setForm((f) => ({ ...f, budget_max: e.target.value }))}
                  placeholder="e.g. 2000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus"
                />
              </div>
            </div>
          </div>

          {/* Skills & Requirements */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-900">Skills & Requirements</h2>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Required Skills</label>
              <div className="flex gap-2 mb-3 flex-wrap">
                {form.skills_required.map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="hover:text-brand-900">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Type a skill and press Enter or comma"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus"
                />
                <button
                  type="button"
                  onClick={() => addSkill(skillInput)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm hover:bg-slate-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Press Enter or comma to add a skill</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Experience Level</label>
              <div className="space-y-2">
                {EXP_LEVELS.map((level) => (
                  <label
                    key={level.value}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      form.experience_level === level.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="experience_level"
                      value={level.value}
                      checked={form.experience_level === level.value}
                      onChange={() => setForm((f) => ({ ...f, experience_level: level.value as 'beginner' | 'intermediate' | 'expert' }))}
                      className="text-brand-600 mt-0.5"
                    />
                    <div>
                      <p className={`font-semibold text-sm ${form.experience_level === level.value ? 'text-brand-700' : 'text-slate-800'}`}>
                        {level.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{level.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Additional */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-900">Additional Details</h2>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_remote"
                checked={form.is_remote}
                onChange={(e) => setForm((f) => ({ ...f, is_remote: e.target.checked }))}
                className="w-4 h-4 rounded text-brand-600"
              />
              <label htmlFor="is_remote" className="text-sm font-medium text-slate-700 cursor-pointer">
                This is a remote project — freelancers can work from anywhere
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Project Deadline (Optional)
              </label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full sm:w-64 px-4 py-3 rounded-xl border border-slate-300 text-slate-900 text-sm input-focus"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-none sm:min-w-[200px] py-4 gradient-card text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 shadow-md text-base"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Posting...</>
              ) : (
                <><CheckCircle2 className="w-5 h-5" /> Post Project</>
              )}
            </button>
            <Link
              href="/projects"
              className="px-6 py-4 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-base"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}

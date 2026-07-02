'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProjectCard from '@/components/ProjectCard';
import { supabase } from '@/lib/supabase/client';
import type { Project, Category } from '@/types/database';
import {
  ArrowRight, Search, Star, Users, Briefcase, TrendingUp,
  Code2, Palette, PenLine, BarChart3, Globe, Smartphone,
  ShieldCheck, Zap, Clock
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Web Development': <Globe className="w-6 h-6" />,
  'Mobile Development': <Smartphone className="w-6 h-6" />,
  'Design': <Palette className="w-6 h-6" />,
  'Writing': <PenLine className="w-6 h-6" />,
  'Marketing': <TrendingUp className="w-6 h-6" />,
  'Data Science': <BarChart3 className="w-6 h-6" />,
  'DevOps': <ShieldCheck className="w-6 h-6" />,
  'Blockchain': <Code2 className="w-6 h-6" />,
};

const STATS = [
  { label: 'Projects Posted', value: '12,000+', icon: <Briefcase className="w-5 h-5" /> },
  { label: 'Skilled Freelancers', value: '50,000+', icon: <Users className="w-5 h-5" /> },
  { label: 'Clients Worldwide', value: '8,500+', icon: <Globe className="w-5 h-5" /> },
  { label: 'Projects Completed', value: '98%', icon: <Star className="w-5 h-5" /> },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Post Your Project',
    desc: 'Describe your project, set your budget, and specify required skills. It takes less than 5 minutes.',
    icon: <Briefcase className="w-7 h-7 text-brand-600" />,
  },
  {
    step: '02',
    title: 'Receive Proposals',
    desc: 'Talented freelancers submit proposals with their approach, timeline, and pricing.',
    icon: <Users className="w-7 h-7 text-brand-600" />,
  },
  {
    step: '03',
    title: 'Hire & Collaborate',
    desc: 'Choose the best fit, communicate directly, and get your project delivered on time.',
    icon: <Zap className="w-7 h-7 text-brand-600" />,
  },
];

export default function HomePage() {
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      const [projectsRes, categoriesRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*, profiles(*)')
          .eq('status', 'open')
          .eq('featured', true)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase.from('categories').select('*').limit(8),
      ]);
      if (projectsRes.data) setFeaturedProjects(projectsRes.data as Project[]);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/projects?search=${encodeURIComponent(searchQuery)}`;
    } else {
      window.location.href = '/projects';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-8 backdrop-blur-sm">
            <Star className="w-4 h-4 text-amber-400" />
            <span>Trusted by 8,500+ businesses worldwide</span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
            Hire the world's best<br />
            <span className="text-brand-300">freelance talent</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect with skilled professionals for any project — from design to development, writing to marketing.
          </p>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for projects or skills..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white text-slate-900 placeholder-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-brand-300 shadow-lg"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-4 bg-brand-500 hover:bg-brand-400 text-white font-semibold rounded-xl transition-colors shadow-lg whitespace-nowrap"
            >
              Search
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-white/70">
            <span>Popular:</span>
            {['React Developer', 'UI Design', 'Content Writing', 'Python', 'SEO'].map((term) => (
              <Link
                key={term}
                href={`/projects?search=${encodeURIComponent(term)}`}
                className="px-3 py-1 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-brand-600">{stat.icon}</span>
                  <span className="text-3xl font-extrabold text-slate-900">{stat.value}</span>
                </div>
                <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
                Browse by Category
              </h2>
              <p className="text-lg text-slate-500">Find experts across every discipline</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/projects?category=${encodeURIComponent(cat.name)}`}
                  className="bg-white rounded-2xl border border-slate-200 p-5 text-center hover:border-brand-300 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 group-hover:bg-brand-100 transition-colors">
                    {CATEGORY_ICONS[cat.name] || <Briefcase className="w-6 h-6" />}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-brand-600 transition-colors">
                    {cat.name}
                  </h3>
                  {cat.project_count !== undefined && (
                    <p className="text-xs text-slate-400 mt-1">{cat.project_count} projects</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Projects */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
                Featured Projects
              </h2>
              <p className="text-slate-500">Hand-picked opportunities for skilled freelancers</p>
            </div>
            <Link
              href="/projects"
              className="hidden md:flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-700 transition-colors"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-full mb-1" />
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : featuredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-50 rounded-2xl">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">No featured projects yet</h3>
              <p className="text-slate-400 mb-6">Be the first to post a project on SkillBridge</p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 px-6 py-3 gradient-card text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Post a Project
              </Link>
            </div>
          )}

          <div className="text-center mt-10 md:hidden">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:text-brand-700"
            >
              View All Projects <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
              How It Works
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Get your project done in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step, idx) => (
              <div key={step.step} className="relative text-center">
                {idx < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full h-px border-t-2 border-dashed border-brand-200 z-0" />
                )}
                <div className="relative z-10 inline-flex items-center justify-center w-16 h-16 bg-brand-50 rounded-2xl mb-6 border-2 border-brand-100">
                  {step.icon}
                </div>
                <div className="text-4xl font-black text-brand-100 mb-2">{step.step}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="gradient-hero rounded-3xl p-12 md:p-16 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-white rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl md:text-5xl font-extrabold mb-5">
                Ready to get started?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto leading-relaxed">
                Join thousands of businesses and freelancers already using SkillBridge to get work done.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/projects/new"
                  className="px-8 py-4 bg-white text-brand-700 font-bold rounded-xl hover:bg-brand-50 transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  <Briefcase className="w-5 h-5" />
                  Post a Project
                </Link>
                <Link
                  href="/projects"
                  className="px-8 py-4 border-2 border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  Find Work
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

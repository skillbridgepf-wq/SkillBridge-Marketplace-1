'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, timeAgo } from '@/lib/utils';
import type { Project, Proposal } from '@/types/database';
import {
  Briefcase, Plus, FileText, Clock, TrendingUp,
  ArrowRight, Loader2, Users, Trophy, CheckCircle2,
  AlertCircle, ExternalLink,
} from 'lucide-react';

// ─── Skeletons ────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse space-y-2">
      <div className="h-3 w-1/4 bg-slate-200 rounded" />
      <div className="h-5 w-3/4 bg-slate-200 rounded" />
      <div className="h-3 w-full  bg-slate-200 rounded" />
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  open:        'bg-emerald-50  text-emerald-700  border-emerald-200',
  in_progress: 'bg-blue-50    text-blue-700     border-blue-200',
  completed:   'bg-slate-100  text-slate-600    border-slate-200',
};
const PROPOSAL_BADGE: Record<string, string> = {
  pending:  'bg-amber-50  text-amber-700  border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50   text-rose-700   border-rose-200',
};

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
  icon, title, href, hrefLabel, count,
}: {
  icon: React.ReactNode;
  title: string;
  href?: string;
  hrefLabel?: string;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
        {icon}
        {title}
        {count !== undefined && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">{count}</span>
        )}
      </h2>
      {href && (
        <Link href={href} className="text-sm text-brand-600 font-semibold hover:text-brand-700 flex items-center gap-1">
          {hrefLabel} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({
  icon, title, desc, href, cta,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
      <div className="w-12 h-12 mx-auto mb-4 text-slate-300 flex items-center justify-center">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-slate-400 text-sm mb-5">{desc}</p>
      <Link
        href={href}
        className="inline-flex items-center gap-2 px-5 py-2.5 gradient-card text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
      >
        {cta}
      </Link>
    </div>
  );
}

// ─── Project row ──────────────────────────────────────────────────────────────
function ProjectRow({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all group"
    >
      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
        <Briefcase className="w-5 h-5 text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900 text-sm truncate group-hover:text-brand-600 transition-colors">
          {project.title}
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">
          {project.category} · {timeAgo(project.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
          <Users className="w-3.5 h-3.5" /> {project.proposals_count ?? 0}
        </span>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${STATUS_BADGE[project.status]}`}>
          {project.status.replace('_', ' ')}
        </span>
        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-brand-400 transition-colors" />
      </div>
    </Link>
  );
}

// ─── Contract card ────────────────────────────────────────────────────────────
function ContractCard({ proposal, asClient }: { proposal: Proposal; asClient: boolean }) {
  const project = proposal.projects as Project | undefined;
  const profile = proposal.profiles;
  const isCompleted = project?.status === 'completed';

  return (
    <Link
      href={`/projects/${proposal.project_id}`}
      className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all group"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-slate-100' : 'bg-emerald-50'}`}>
        {isCompleted
          ? <CheckCircle2 className="w-5 h-5 text-slate-500" />
          : <Trophy       className="w-5 h-5 text-emerald-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900 text-sm group-hover:text-brand-600 transition-colors truncate">
          {project?.title ?? 'Project'}
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">
          {asClient
            ? `Freelancer: ${profile?.full_name ?? 'Unknown'}`
            : `Client project`}
          {proposal.estimated_duration && ` · ${proposal.estimated_duration}`}
        </p>
        {proposal.proposed_rate && (
          <p className="text-xs font-semibold text-brand-600 mt-1">
            {formatCurrency(proposal.proposed_rate)}{project?.budget_type === 'hourly' ? '/hr' : ''}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${isCompleted ? STATUS_BADGE.completed : STATUS_BADGE.in_progress}`}>
          {isCompleted ? 'Completed' : 'Active'}
        </span>
        <p className="text-xs text-slate-400 mt-1">{timeAgo(proposal.created_at)}</p>
      </div>
    </Link>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [myProjects,  setMyProjects]  = useState<Project[]>([]);
  const [myProposals, setMyProposals] = useState<Proposal[]>([]);
  const [contracts,   setContracts]   = useState<Proposal[]>([]);
  const [loading,     setLoading]     = useState(true);

  // redirect unauthenticated
  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [projRes, propRes, contractRes] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('proposals')
        .select('*, projects(*)')
        .eq('freelancer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
      // Contracts: proposals the user accepted as client OR their own accepted proposal as freelancer
      supabase
        .from('proposals')
        .select('*, projects(*), profiles(*)')
        .eq('status', 'accepted')
        .or(`freelancer_id.eq.${user.id},projects.client_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (projRes.data)    setMyProjects(projRes.data as Project[]);
    if (propRes.data)    setMyProposals(propRes.data as Proposal[]);
    if (contractRes.data) setContracts(contractRes.data as Proposal[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  const displayName     = user?.user_metadata?.full_name as string | undefined
                          ?? user?.email?.split('@')[0]
                          ?? 'there';
  const openCount       = myProjects.filter((p) => p.status === 'open').length;
  const inProgressCount = myProjects.filter((p) => p.status === 'in_progress').length;
  const pendingCount    = myProposals.filter((p) => p.status === 'pending').length;
  const acceptedCount   = myProposals.filter((p) => p.status === 'accepted').length;

  const STATS = [
    {
      label: 'My Projects',
      value: myProjects.length,
      icon: <Briefcase className="w-5 h-5" />,
      color: 'bg-brand-50 text-brand-600',
      sub: `${openCount} open · ${inProgressCount} active`,
    },
    {
      label: 'My Proposals',
      value: myProposals.length,
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-amber-50 text-amber-600',
      sub: `${pendingCount} pending`,
    },
    {
      label: 'Active Contracts',
      value: contracts.filter((c) => c.projects && (c.projects as Project).status === 'in_progress').length,
      icon: <Trophy className="w-5 h-5" />,
      color: 'bg-emerald-50 text-emerald-600',
      sub: `${acceptedCount} accepted proposals`,
    },
    {
      label: 'Needs Review',
      value: myProjects.reduce((acc, p) => acc + (p.proposals_count ?? 0), 0),
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'bg-rose-50 text-rose-600',
      sub: 'total proposals received',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">

        {/* Welcome */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
              Welcome back, {displayName} 👋
            </h1>
            <p className="text-slate-500 text-sm sm:text-base">Here's everything happening with your work.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/projects"
              className="px-4 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-white transition-colors text-sm"
            >
              Find Work
            </Link>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 gradient-card text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm text-sm"
            >
              <Plus className="w-4 h-4" /> Post Project
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className={`inline-flex p-2 rounded-xl mb-3 ${s.color}`}>{s.icon}</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-0.5">
                {loading ? <div className="h-7 w-8 bg-slate-200 rounded animate-pulse" /> : s.value}
              </div>
              <div className="text-sm font-semibold text-slate-700">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Pending proposals alert */}
        {!loading && pendingCount > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              You have <span className="font-bold">{pendingCount} pending proposal{pendingCount !== 1 ? 's' : ''}</span> waiting for a response.
            </p>
            <Link href="/projects" className="ml-auto text-sm font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap">
              View Projects
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* My Projects (as client) */}
          <section>
            <SectionHeader
              icon={<Briefcase className="w-5 h-5 text-brand-600" />}
              title="My Projects"
              href="/projects/new"
              hrefLabel="New Project"
              count={myProjects.length}
            />
            {loading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <SkeletonCard key={i} />)}</div>
            ) : myProjects.length > 0 ? (
              <div className="space-y-2">
                {myProjects.map((p) => <ProjectRow key={p.id} project={p} />)}
              </div>
            ) : (
              <EmptyState
                icon={<Briefcase className="w-10 h-10" />}
                title="No projects yet"
                desc="Post your first project and start receiving proposals from talented freelancers."
                href="/projects/new"
                cta="Post a Project"
              />
            )}
          </section>

          {/* My Proposals (as freelancer) */}
          <section>
            <SectionHeader
              icon={<FileText className="w-5 h-5 text-brand-600" />}
              title="My Proposals"
              href="/projects"
              hrefLabel="Browse Projects"
              count={myProposals.length}
            />
            {loading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <SkeletonCard key={i} />)}</div>
            ) : myProposals.length > 0 ? (
              <div className="space-y-2">
                {myProposals.map((proposal) => {
                  const proj = proposal.projects as Project | undefined;
                  return (
                    <Link
                      key={proposal.id}
                      href={`/projects/${proposal.project_id}`}
                      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 text-sm truncate group-hover:text-brand-600 transition-colors">
                          {proj?.title ?? 'Project'}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {proposal.cover_letter}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        {proposal.proposed_rate && (
                          <span className="hidden sm:block text-xs font-semibold text-slate-700">
                            {formatCurrency(proposal.proposed_rate)}
                          </span>
                        )}
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${PROPOSAL_BADGE[proposal.status]}`}>
                          {proposal.status}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="w-10 h-10" />}
                title="No proposals yet"
                desc="Find open projects and submit your first proposal to get work."
                href="/projects"
                cta="Browse Projects"
              />
            )}
          </section>
        </div>

        {/* Active Contracts */}
        <section className="mt-10">
          <SectionHeader
            icon={<Trophy className="w-5 h-5 text-brand-600" />}
            title="Active Contracts"
            href="/contracts"
            hrefLabel="View All"
            count={contracts.length}
          />
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : contracts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contracts.map((c) => (
                <ContractCard
                  key={c.id}
                  proposal={c}
                  asClient={c.freelancer_id !== user?.id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700 mb-1">No active contracts</h3>
              <p className="text-slate-400 text-sm">
                Contracts appear here when a client accepts your proposal or you accept a freelancer's proposal.
              </p>
            </div>
          )}
        </section>

      </main>
      <Footer />
    </div>
  );
}

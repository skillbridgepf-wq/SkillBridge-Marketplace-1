'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDate, timeAgo } from '@/lib/utils';
import type { Proposal, Project, Profile } from '@/types/database';
import {
  Trophy, Loader2, ExternalLink, CheckCircle2, Clock,
  DollarSign, User, Briefcase, ArrowRight,
} from 'lucide-react';

const STATUS_CONFIG = {
  in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
  completed:   { label: 'Completed',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  open:        { label: 'Open',        color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400' },
};

function Avatar({ profile, size = 'md' }: { profile?: Profile; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return profile?.avatar_url ? (
    <img src={profile.avatar_url} alt={profile.full_name ?? ''} className={`${dim} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${dim} rounded-full gradient-card flex items-center justify-center text-white font-bold shrink-0`}>
      {(profile?.full_name ?? 'U')[0].toUpperCase()}
    </div>
  );
}

interface ContractWithAll extends Proposal {
  profiles?: Profile;
  projects?: Project & { profiles?: Profile };
}

export default function ContractsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [contracts, setContracts] = useState<ContractWithAll[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  const fetchContracts = useCallback(async () => {
    if (!user) return;
    // Fetch accepted proposals where user is freelancer
    const { data: asFreelancer } = await supabase
      .from('proposals')
      .select('*, projects(*, profiles(*))')
      .eq('status', 'accepted')
      .eq('freelancer_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch accepted proposals for projects the user owns (as client)
    const { data: asClient } = await supabase
      .from('proposals')
      .select('*, profiles(*), projects!inner(*)')
      .eq('status', 'accepted')
      .eq('projects.client_id', user.id)
      .order('created_at', { ascending: false });

    const all = [...(asFreelancer ?? []), ...(asClient ?? [])] as ContractWithAll[];
    // Deduplicate by proposal id
    const seen = new Set<string>();
    const deduped = all.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    setContracts(deduped);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  const activeContracts    = contracts.filter((c) => (c.projects as Project | undefined)?.status === 'in_progress');
  const completedContracts = contracts.filter((c) => (c.projects as Project | undefined)?.status === 'completed');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1 flex items-center gap-3">
            <Trophy className="w-7 h-7 text-brand-600" /> My Contracts
          </h1>
          <p className="text-slate-500">All active and completed work agreements.</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-3">
                <div className="h-4 w-2/3 bg-slate-200 rounded" />
                <div className="h-3 w-1/3 bg-slate-200 rounded" />
                <div className="h-12 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : contracts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <Trophy className="w-14 h-14 text-slate-200 mx-auto mb-5" />
            <h2 className="text-xl font-bold text-slate-700 mb-2">No contracts yet</h2>
            <p className="text-slate-400 mb-7 max-w-sm mx-auto">
              Contracts are created when a client accepts a freelancer's proposal. Start by posting a project or applying to one.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                <Briefcase className="w-4 h-4" /> Browse Projects
              </Link>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 gradient-card text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm"
              >
                Post a Project <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Active contracts */}
            {activeContracts.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  Active ({activeContracts.length})
                </h2>
                <div className="space-y-4">
                  {activeContracts.map((contract) => (
                    <ContractCard key={contract.id} contract={contract} userId={user!.id} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed contracts */}
            {completedContracts.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Completed ({completedContracts.length})
                </h2>
                <div className="space-y-4">
                  {completedContracts.map((contract) => (
                    <ContractCard key={contract.id} contract={contract} userId={user!.id} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function ContractCard({ contract, userId }: { contract: ContractWithAll; userId: string }) {
  const project   = contract.projects as (Project & { profiles?: Profile }) | undefined;
  const isClient  = project?.client_id === userId;
  const isCompleted = project?.status === 'completed';
  const statusCfg   = STATUS_CONFIG[project?.status ?? 'in_progress'];

  // As client: the other party is the freelancer (contract.profiles)
  // As freelancer: the other party is the client (project.profiles)
  const otherParty  = isClient ? contract.profiles : project?.profiles;
  const myRole      = isClient ? 'Client' : 'Freelancer';
  const theirRole   = isClient ? 'Freelancer' : 'Client';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-brand-200 hover:shadow-sm transition-all">
      <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/projects/${contract.project_id}`}
            className="text-base font-bold text-slate-900 hover:text-brand-600 transition-colors flex items-center gap-2 group"
          >
            {project?.title ?? 'Project'}
            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <p className="text-xs text-slate-500 mt-0.5">
            {project?.category} · Posted {project?.created_at ? timeAgo(project.created_at) : ''}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>

      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Other party */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{theirRole}</p>
          <div className="flex items-center gap-2">
            <Avatar profile={otherParty} size="sm" />
            <div>
              <p className="text-sm font-semibold text-slate-800">{otherParty?.full_name ?? 'Unknown'}</p>
              {otherParty?.location && (
                <p className="text-xs text-slate-400">{otherParty.location}</p>
              )}
            </div>
          </div>
        </div>

        {/* Rate */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Agreed Rate</p>
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-bold text-slate-900">
              {contract.proposed_rate
                ? `${formatCurrency(contract.proposed_rate)}${project?.budget_type === 'hourly' ? '/hr' : ''}`
                : 'Not specified'}
            </span>
          </div>
          {contract.estimated_duration && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {contract.estimated_duration}
            </p>
          )}
        </div>

        {/* Timeline */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Timeline</p>
          <div className="text-sm text-slate-700">
            <p>Started {timeAgo(contract.created_at)}</p>
            {project?.deadline && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" /> Due {formatDate(project.deadline)}
              </p>
            )}
            {isCompleted && (
              <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cover letter summary */}
      {contract.cover_letter && (
        <div className="px-6 pb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Proposal Summary</p>
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{contract.cover_letter}</p>
        </div>
      )}

      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">Your role: <span className="font-semibold text-slate-600">{myRole}</span></span>
        <Link
          href={`/projects/${contract.project_id}`}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
        >
          View Project <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase/client';
import { formatCurrency, formatDate, timeAgo } from '@/lib/utils';
import type {
  Project, Proposal, Profile,
  ProposalInsert, ProposalUpdate, ProjectUpdate,
} from '@/types/database';
import {
  ArrowLeft, Clock, DollarSign, MapPin, Users, Star,
  Briefcase, CheckCircle2, Loader2, Send, AlertCircle,
  User, XCircle, ThumbsUp, ThumbsDown, Trophy, ChevronDown,
  ChevronUp, ExternalLink,
} from 'lucide-react';

// ─── Proposal status badge ───────────────────────────────────────────────────
const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-amber-50  text-amber-700  border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50   text-rose-700   border-rose-200',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', accepted: 'Accepted', rejected: 'Declined',
};

const PROJECT_STATUS_CONFIG = {
  open:        { label: 'Open for Proposals', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  in_progress: { label: 'In Progress',         color: 'bg-blue-50   text-blue-700   border-blue-200'   },
  completed:   { label: 'Completed',           color: 'bg-slate-100 text-slate-600  border-slate-200'  },
};

// ─── Freelancer avatar ───────────────────────────────────────────────────────
function Avatar({ profile, size = 'md' }: { profile?: Profile; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-sm';
  const letter = (profile?.full_name || 'U')[0].toUpperCase();
  return profile?.avatar_url ? (
    <img src={profile.avatar_url} alt={profile.full_name ?? ''} className={`${dim} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${dim} rounded-full gradient-card flex items-center justify-center text-white font-bold shrink-0`}>
      {letter}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-8 animate-pulse space-y-3">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-6 w-3/4 bg-slate-200 rounded" />
                <div className="h-4 w-full bg-slate-200 rounded" />
                <div className="h-4 w-2/3 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-3">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-16 w-full bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const id = params?.id as string;

  const [project,          setProject]          = useState<Project | null>(null);
  const [proposals,        setProposals]        = useState<Proposal[]>([]);
  const [existingProposal, setExistingProposal] = useState<Proposal | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [actionLoading,    setActionLoading]    = useState<string | null>(null); // proposalId or 'complete'
  const [expandedProposal, setExpandedProposal] = useState<string | null>(null);

  const [form, setForm] = useState({ cover_letter: '', proposed_rate: '', estimated_duration: '' });
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState('');

  // ── Fetch project + proposals ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!id) return;
    const [projRes, propRes] = await Promise.all([
      supabase.from('projects').select('*, profiles(*)').eq('id', id).single(),
      supabase
        .from('proposals')
        .select('*, profiles(*)')
        .eq('project_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (projRes.data) setProject(projRes.data as unknown as Project);
    if (propRes.data) {
      const all = propRes.data as unknown as Proposal[];
      setProposals(all);
      if (user) {
        const mine = all.find((p) => p.freelancer_id === user.id) ?? null;
        setExistingProposal(mine);
      }
    }
    setLoading(false);
  }, [id, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Submit proposal (freelancer) ──────────────────────────────────────────
  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { router.push('/auth/login'); return; }
    setSubmitting(true);
    setSubmitError('');

    const payload: ProposalInsert = {
      project_id:         id,
      freelancer_id:      user.id,
      cover_letter:       form.cover_letter,
      proposed_rate:      form.proposed_rate ? Number(form.proposed_rate) : null,
      estimated_duration: form.estimated_duration || null,
      status:             'pending',
    };

    const { error } = await supabase.from('proposals').insert(payload);
    if (error) {
      setSubmitError(error.message);
    } else {
      toast('Proposal submitted! The client will review and respond.');
      await fetchData();
    }
    setSubmitting(false);
  };

  // ── Accept proposal (client) ──────────────────────────────────────────────
  const handleAccept = async (proposalId: string) => {
    setActionLoading(proposalId);
    const propUpdate: ProposalUpdate = { status: 'accepted' };
    const projUpdate: ProjectUpdate  = { status: 'in_progress' };

    const [propRes, projRes] = await Promise.all([
      supabase.from('proposals').update(propUpdate).eq('id', proposalId),
      supabase.from('projects').update(projUpdate).eq('id', id),
    ]);

    if (propRes.error || projRes.error) {
      toast(propRes.error?.message ?? projRes.error?.message ?? 'Error accepting proposal', 'error');
    } else {
      toast('Proposal accepted! Project is now in progress.');
      await fetchData();
    }
    setActionLoading(null);
  };

  // ── Reject proposal (client) ──────────────────────────────────────────────
  const handleReject = async (proposalId: string) => {
    setActionLoading(proposalId);
    const update: ProposalUpdate = { status: 'rejected' };
    const { error } = await supabase.from('proposals').update(update).eq('id', proposalId);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Proposal declined.');
      await fetchData();
    }
    setActionLoading(null);
  };

  // ── Mark project complete (client) ────────────────────────────────────────
  const handleMarkComplete = async () => {
    setActionLoading('complete');
    const update: ProjectUpdate = { status: 'completed' };
    const { error } = await supabase.from('projects').update(update).eq('id', id);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Project marked as completed! 🎉');
      await fetchData();
    }
    setActionLoading(null);
  };

  // ─── Loading / not found ──────────────────────────────────────────────────
  if (loading) return <PageSkeleton />;

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <Briefcase className="w-12 h-12 text-slate-300" />
          <h2 className="text-2xl font-bold text-slate-800">Project not found</h2>
          <p className="text-slate-500">This project may have been removed or doesn't exist.</p>
          <Link href="/projects" className="text-brand-600 font-semibold hover:underline">
            Browse Projects
          </Link>
        </div>
      </div>
    );
  }

  const isOwner      = user?.id === project.client_id;
  const clientProfile = project.profiles;
  const statusConfig  = PROJECT_STATUS_CONFIG[project.status] ?? PROJECT_STATUS_CONFIG.open;
  const acceptedProp  = proposals.find((p) => p.status === 'accepted');
  const pendingCount  = proposals.filter((p) => p.status === 'pending').length;
  const canPropose    = !isOwner && project.status === 'open' && !existingProposal;
  const canComplete   = isOwner && project.status === 'in_progress' && !!acceptedProp;

  const budgetDisplay = project.budget_min && project.budget_max
    ? `${formatCurrency(project.budget_min)} – ${formatCurrency(project.budget_max)}`
    : project.budget_min  ? `From ${formatCurrency(project.budget_min)}`
    : project.budget_max  ? `Up to ${formatCurrency(project.budget_max)}`
    : 'Negotiable';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Breadcrumb */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ═══ LEFT COLUMN ═══════════════════════════════════════════════ */}
          <div className="lg:col-span-2 space-y-5">

            {/* Project header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-brand-50 text-brand-700">
                  {project.category}
                </span>
                {project.featured && (
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700">
                    <Star className="w-3.5 h-3.5" /> Featured
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4 leading-tight">
                {project.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500 mb-6">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Posted {timeAgo(project.created_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> {project.proposals_count ?? proposals.length} proposals
                </span>
                {project.is_remote && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> Remote
                  </span>
                )}
                {project.deadline && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <Clock className="w-4 h-4" /> Deadline: {formatDate(project.deadline)}
                  </span>
                )}
              </div>

              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                {project.description}
              </p>
            </div>

            {/* Skills */}
            {project.skills_required && project.skills_required.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide text-slate-500">
                  Required Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.skills_required.map((skill) => (
                    <span key={skill} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── CLIENT VIEW: in_progress contract banner ── */}
            {isOwner && project.status === 'in_progress' && acceptedProp && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <Trophy className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-blue-900 mb-1">Project in Progress</h3>
                    <p className="text-sm text-blue-700 mb-3">
                      You accepted a proposal from{' '}
                      <span className="font-semibold">
                        {acceptedProp.profiles?.full_name ?? 'the freelancer'}
                      </span>
                      {acceptedProp.proposed_rate && (
                        <> at <span className="font-semibold">{formatCurrency(acceptedProp.proposed_rate)}</span></>
                      )}
                      {acceptedProp.estimated_duration && (
                        <> · {acceptedProp.estimated_duration}</>
                      )}
                      .
                    </p>
                    {canComplete && (
                      <button
                        onClick={handleMarkComplete}
                        disabled={actionLoading === 'complete'}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-xl text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
                      >
                        {actionLoading === 'complete'
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <CheckCircle2 className="w-4 h-4" />}
                        Mark as Completed
                      </button>
                    )}
                  </div>
                  <Avatar profile={acceptedProp.profiles} size="md" />
                </div>
              </div>
            )}

            {/* ── CLIENT VIEW: completed banner ── */}
            {isOwner && project.status === 'completed' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4">
                <Trophy className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-emerald-900">Project Completed!</h3>
                  <p className="text-sm text-emerald-700">
                    Completed {acceptedProp ? `with ${acceptedProp.profiles?.full_name ?? 'the freelancer'}` : ''}.
                  </p>
                </div>
              </div>
            )}

            {/* ── CLIENT VIEW: Proposals list ── */}
            {isOwner && proposals.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-600" />
                    Proposals
                    <span className="ml-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                      {proposals.length}
                    </span>
                  </h3>
                  {pendingCount > 0 && (
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
                      {pendingCount} awaiting review
                    </span>
                  )}
                </div>

                <div className="divide-y divide-slate-100">
                  {proposals.map((proposal) => {
                    const isExpanded   = expandedProposal === proposal.id;
                    const isActioning  = actionLoading === proposal.id;
                    const freelancer   = proposal.profiles;
                    const isPending    = proposal.status === 'pending';
                    const isAccepted   = proposal.status === 'accepted';

                    return (
                      <div
                        key={proposal.id}
                        className={`p-5 transition-colors ${isAccepted ? 'bg-emerald-50/50' : ''}`}
                      >
                        <div className="flex items-start gap-4">
                          <Avatar profile={freelancer} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-900 text-sm">
                                {freelancer?.full_name ?? 'Freelancer'}
                              </span>
                              {freelancer?.location && (
                                <span className="text-xs text-slate-400">{freelancer.location}</span>
                              )}
                              <span className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[proposal.status]}`}>
                                {STATUS_LABEL[proposal.status]}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-2">
                              {proposal.proposed_rate && (
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <DollarSign className="w-3.5 h-3.5 text-brand-500" />
                                  {formatCurrency(proposal.proposed_rate)}
                                  {project.budget_type === 'hourly' ? '/hr' : ''}
                                </span>
                              )}
                              {proposal.estimated_duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> {proposal.estimated_duration}
                                </span>
                              )}
                              <span>{timeAgo(proposal.created_at)}</span>
                            </div>

                            {/* Cover letter — expandable */}
                            <p className={`text-sm text-slate-600 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                              {proposal.cover_letter}
                            </p>
                            {proposal.cover_letter.length > 120 && (
                              <button
                                onClick={() => setExpandedProposal(isExpanded ? null : proposal.id)}
                                className="text-xs text-brand-600 font-semibold mt-1 flex items-center gap-1 hover:text-brand-700"
                              >
                                {isExpanded ? (
                                  <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                                ) : (
                                  <><ChevronDown className="w-3.5 h-3.5" /> Read more</>
                                )}
                              </button>
                            )}

                            {/* Freelancer skills */}
                            {freelancer?.skills && freelancer.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {freelancer.skills.slice(0, 4).map((s) => (
                                  <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action buttons — only for pending proposals while project is open */}
                        {isPending && project.status === 'open' && (
                          <div className="flex gap-2 mt-4 pl-14">
                            <button
                              onClick={() => handleAccept(proposal.id)}
                              disabled={isActioning}
                              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60"
                            >
                              {isActioning
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <ThumbsUp className="w-3.5 h-3.5" />}
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(proposal.id)}
                              disabled={isActioning}
                              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-60"
                            >
                              {isActioning
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <ThumbsDown className="w-3.5 h-3.5" />}
                              Decline
                            </button>
                          </div>
                        )}

                        {isAccepted && (
                          <div className="flex items-center gap-2 mt-3 pl-14 text-emerald-700 text-xs font-semibold">
                            <CheckCircle2 className="w-4 h-4" /> Accepted — work in progress
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── CLIENT: no proposals yet ── */}
            {isOwner && proposals.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-700 mb-1">No proposals yet</h3>
                <p className="text-slate-400 text-sm">Proposals will appear here as freelancers apply.</p>
              </div>
            )}

            {/* ── FREELANCER VIEW: proposal status ── */}
            {!isOwner && existingProposal && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-brand-600" /> Your Proposal
                </h3>
                <div className={`rounded-xl p-4 border ${STATUS_BADGE[existingProposal.status]}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {existingProposal.status === 'accepted' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                    {existingProposal.status === 'rejected' && <XCircle className="w-5 h-5 text-rose-500" />}
                    {existingProposal.status === 'pending'  && <Clock    className="w-5 h-5 text-amber-500" />}
                    <span className="font-semibold capitalize">{STATUS_LABEL[existingProposal.status]}</span>
                    {existingProposal.proposed_rate && (
                      <span className="ml-auto text-sm font-semibold">
                        {formatCurrency(existingProposal.proposed_rate)}{project.budget_type === 'hourly' ? '/hr' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed opacity-80">{existingProposal.cover_letter}</p>
                  {existingProposal.status === 'accepted' && (
                    <Link
                      href="/contracts"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View in My Contracts
                    </Link>
                  )}
                  {existingProposal.status === 'pending' && (
                    <p className="text-xs mt-2 opacity-70">
                      Submitted {timeAgo(existingProposal.created_at)} · Awaiting client review
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── FREELANCER: submit proposal form ── */}
            {canPropose && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Send className="w-5 h-5 text-brand-600" /> Submit a Proposal
                </h3>

                {!user ? (
                  <div className="text-center py-8">
                    <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium mb-4">Sign in to submit a proposal</p>
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center gap-2 px-6 py-3 gradient-card text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                    >
                      Sign In to Apply
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleProposalSubmit} className="space-y-5">
                    {submitError && (
                      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        {submitError}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                        Cover Letter <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={5}
                        required
                        minLength={30}
                        value={form.cover_letter}
                        onChange={(e) => setForm((f) => ({ ...f, cover_letter: e.target.value }))}
                        placeholder="Introduce yourself, explain your relevant experience, and describe your approach to this project..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus resize-none"
                      />
                      <p className="text-xs text-slate-400 mt-1">{form.cover_letter.length} characters (min 30)</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          Your Rate{project.budget_type === 'hourly' ? ' ($/hr)' : ' ($)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={form.proposed_rate}
                          onChange={(e) => setForm((f) => ({ ...f, proposed_rate: e.target.value }))}
                          placeholder={project.budget_type === 'hourly' ? 'e.g. 85' : 'e.g. 2500'}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          Estimated Duration
                        </label>
                        <input
                          type="text"
                          value={form.estimated_duration}
                          onChange={(e) => setForm((f) => ({ ...f, estimated_duration: e.target.value }))}
                          placeholder="e.g. 2 weeks"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-sm input-focus"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 gradient-card text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Submit Proposal
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ── FREELANCER: project not open ── */}
            {!isOwner && !existingProposal && project.status !== 'open' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <XCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-600">This project is no longer accepting proposals.</p>
                <Link href="/projects" className="text-brand-600 text-sm font-semibold hover:underline mt-2 inline-block">
                  Browse Open Projects
                </Link>
              </div>
            )}
          </div>

          {/* ═══ RIGHT SIDEBAR ══════════════════════════════════════════════ */}
          <div className="space-y-5">
            {/* Project details card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-5 text-sm uppercase tracking-wide text-slate-500">
                Project Details
              </h3>
              <div className="space-y-4">
                <DetailRow icon={<DollarSign className="w-4 h-4 text-brand-600" />} label="Budget" value={budgetDisplay} sub={project.budget_type} />
                <DetailRow icon={<Briefcase className="w-4 h-4 text-brand-600" />}  label="Experience" value={project.experience_level} capitalize />
                <DetailRow icon={<MapPin className="w-4 h-4 text-brand-600" />}    label="Location" value={project.is_remote ? 'Remote' : 'On-site'} />
                {project.deadline && (
                  <DetailRow icon={<Clock className="w-4 h-4 text-brand-600" />} label="Deadline" value={formatDate(project.deadline)} />
                )}
              </div>
            </div>

            {/* Client info */}
            {clientProfile && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide text-slate-500">
                  About the Client
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar profile={clientProfile} size="lg" />
                  <div>
                    <p className="font-semibold text-slate-900">{clientProfile.full_name ?? 'Client'}</p>
                    {clientProfile.location && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {clientProfile.location}
                      </p>
                    )}
                  </div>
                </div>
                {clientProfile.bio && (
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{clientProfile.bio}</p>
                )}
              </div>
            )}

            {/* Owner actions */}
            {isOwner && project.status === 'open' && (
              <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5">
                <h3 className="font-bold text-brand-900 mb-3 text-sm">Manage Project</h3>
                <p className="text-xs text-brand-700 mb-3">
                  You have {pendingCount} pending proposal{pendingCount !== 1 ? 's' : ''} waiting for review.
                </p>
                <Link
                  href="/dashboard"
                  className="block w-full text-center px-4 py-2.5 bg-white border border-brand-200 text-brand-700 font-semibold rounded-xl text-sm hover:bg-brand-50 transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Small helper to keep sidebar clean
function DetailRow({
  icon, label, value, sub, capitalize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className={`text-sm font-bold text-slate-900 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 capitalize">{sub}</p>}
      </div>
    </div>
  );
}

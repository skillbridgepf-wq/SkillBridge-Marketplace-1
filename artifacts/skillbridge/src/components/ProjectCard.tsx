import Link from 'next/link';
import { MapPin, Clock, DollarSign, Users, Star } from 'lucide-react';
import { formatCurrency, timeAgo } from '@/lib/utils';
import type { Project } from '@/types/database';

const CATEGORY_COLORS: Record<string, string> = {
  'Web Development': 'bg-blue-50 text-blue-700',
  'Mobile Development': 'bg-purple-50 text-purple-700',
  'Design': 'bg-pink-50 text-pink-700',
  'Writing': 'bg-amber-50 text-amber-700',
  'Marketing': 'bg-emerald-50 text-emerald-700',
  'Data Science': 'bg-cyan-50 text-cyan-700',
  'DevOps': 'bg-orange-50 text-orange-700',
  'Blockchain': 'bg-indigo-50 text-indigo-700',
};

const EXP_LABELS: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Entry Level', color: 'text-emerald-600 bg-emerald-50' },
  intermediate: { label: 'Intermediate', color: 'text-amber-600 bg-amber-50' },
  expert: { label: 'Expert', color: 'text-rose-600 bg-rose-50' },
};

interface ProjectCardProps {
  project: Project;
  compact?: boolean;
}

export default function ProjectCard({ project, compact = false }: ProjectCardProps) {
  const expInfo = EXP_LABELS[project.experience_level] || EXP_LABELS.intermediate;
  const categoryColor = CATEGORY_COLORS[project.category] || 'bg-brand-50 text-brand-700';

  const budgetDisplay =
    project.budget_min && project.budget_max
      ? `${formatCurrency(project.budget_min)} – ${formatCurrency(project.budget_max)}`
      : project.budget_min
      ? `From ${formatCurrency(project.budget_min)}`
      : project.budget_max
      ? `Up to ${formatCurrency(project.budget_max)}`
      : 'Negotiable';

  return (
    <Link href={`/projects/${project.id}`} className="block">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 card-hover cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColor}`}>
                {project.category}
              </span>
              {project.featured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                  <Star className="w-3 h-3" />
                  Featured
                </span>
              )}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${expInfo.color}`}>
                {expInfo.label}
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2 leading-snug">
              {project.title}
            </h3>
          </div>

          <div className="shrink-0 text-right">
            <div className="flex items-center gap-1 justify-end text-slate-900">
              <DollarSign className="w-4 h-4 text-brand-500" />
              <span className="text-sm font-semibold whitespace-nowrap">{budgetDisplay}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 capitalize">
              {project.budget_type === 'hourly' ? '/hr' : 'fixed'}
            </div>
          </div>
        </div>

        {!compact && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
            {project.description}
          </p>
        )}

        {/* Skills */}
        {project.skills_required && project.skills_required.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {project.skills_required.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg"
              >
                {skill}
              </span>
            ))}
            {project.skills_required.length > 4 && (
              <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-500 rounded-lg">
                +{project.skills_required.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {project.is_remote ? (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                Remote
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {timeAgo(project.created_at)}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {project.proposals_count ?? 0} proposal{project.proposals_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </Link>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  GitBranch,
  Clock,
  Pencil,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { parseTechStack, normalizeUrl } from '../lib/sheets';

export function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function WebsiteCard({ website, onEdit, onDelete }) {
  const techItems = parseTechStack(website.tech_stack);
  const liveUrl = normalizeUrl(website.website_url);
  const repoUrl = normalizeUrl(website.repository_url);

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
      <div>
        {/* Card Header: Name & Status */}
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/websites/${website.id}`}
            className="text-base font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1"
          >
            {website.name}
          </Link>
          <div className="shrink-0">
            <StatusBadge status={website.status} />
          </div>
        </div>

        {/* Description */}
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">
          {website.description || 'No description provided.'}
        </p>

        {/* Website URL & Repo URL */}
        <div className="mt-3.5 space-y-1.5 text-xs">
          {liveUrl ? (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline truncate"
              >
                {website.website_url.replace(/^https?:\/\//i, '')}
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span>Not deployed yet</span>
            </div>
          )}

          {repoUrl && (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
              <GitBranch className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline truncate"
              >
                {website.repository_url.replace(/^https?:\/\/(www\.)?github\.com\//i, '')}
              </a>
            </div>
          )}
        </div>

        {/* Tech Stack Badges */}
        {techItems.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {techItems.slice(0, 5).map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {tech}
              </span>
            ))}
            {techItems.length > 5 && (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                +{techItems.length - 5}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Updated Date & Actions */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Updated {formatDate(website.updated_at || website.created_at)}</span>
        </div>

        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(website)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Edit website"
              aria-label={`Edit ${website.name}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(website)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Delete website"
              aria-label={`Delete ${website.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <Link
            to={`/websites/${website.id}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 transition-colors"
          >
            <span>Details</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}


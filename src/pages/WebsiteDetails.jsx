import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  Calendar,
  Clock,
  Layers,
  FileText,
  Pencil,
  Trash2,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchWebsiteById,
  updateWebsite,
  deleteWebsite,
  parseTechStack,
  normalizeUrl,
} from '../lib/sheets';
import StatusBadge from '../components/StatusBadge';
import WebsiteForm, { DeleteConfirmModal } from '../components/WebsiteForm';
import { formatDate } from '../components/WebsiteCard';

export default function WebsiteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [website, setWebsite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit & Delete Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadWebsite = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: fetchErr } = await fetchWebsiteById(id);
    if (fetchErr || !data) {
      setError(fetchErr || 'Website project not found.');
    } else {
      setWebsite(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadWebsite();
  }, [loadWebsite]);

  const handleUpdate = async (payload) => {
    if (!user || !website) return { error: 'Not authenticated.' };
    setSubmitting(true);
    try {
      const { data, error: updateErr } = await updateWebsite(
        website.id,
        user.id,
        payload
      );
      if (updateErr) return { error: updateErr };
      setWebsite(data);
      setIsEditOpen(false);
      return { error: null };
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !website) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const { error: delErr } = await deleteWebsite(website.id, user.id);
      if (delErr) {
        setDeleteError(delErr);
        return;
      }
      navigate('/websites', { replace: true });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
          <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800/60 rounded" />
          <div className="h-32 w-full bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !website) {
    return (
      <div className="space-y-6">
        <Link
          to="/websites"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Websites</span>
        </Link>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Unable to Load Website Details
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error || 'This project record could not be found or you do not have access.'}
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const liveUrl = normalizeUrl(website.website_url);
  const repoUrl = normalizeUrl(website.repository_url);
  const techItems = parseTechStack(website.tech_stack);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/websites"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Websites</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            <span>Edit Project</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDeleteError('');
              setIsDeleteOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/70 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Header Section */}
        <div className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {website.name}
                </h1>
                <StatusBadge status={website.status} />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                {website.description || 'No description provided.'}
              </p>
            </div>

            {/* Quick External Links */}
            <div className="flex flex-wrap items-center gap-2.5">
              {liveUrl && (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span>Open Live Website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                >
                  <GitBranch className="w-4 h-4" />
                  <span>GitHub Repository</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
          {/* Live Website URL */}
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Globe className="w-3.5 h-3.5" />
              Live Website URL
            </span>
            {liveUrl ? (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline break-all"
              >
                <span>{website.website_url}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Not deployed / No live URL recorded
              </p>
            )}
          </div>

          {/* Repository URL */}
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <GitBranch className="w-3.5 h-3.5" />
              GitHub Repository URL
            </span>
            {repoUrl ? (
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline break-all"
              >
                <span>{website.repository_url}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                No repository URL recorded
              </p>
            )}
          </div>

          {/* Date Created */}
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              Date Created
            </span>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {formatDate(website.created_at)}
            </p>
          </div>

          {/* Last Updated */}
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              Last Updated Date
            </span>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {formatDate(website.updated_at || website.created_at)}
            </p>
          </div>
        </div>

        {/* Technology Stack & Personal Notes */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Tech Stack */}
          <div>
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Technology Stack</span>
            </h2>
            {techItems.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {techItems.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                No technologies listed.
              </p>
            )}
          </div>

          {/* Personal Notes */}
          <div>
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Personal Notes</span>
            </h2>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4">
              {website.notes ? (
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {website.notes}
                </p>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No personal notes added for this project yet. Click &ldquo;Edit Project&rdquo; to add notes.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <WebsiteForm
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleUpdate}
        initialData={website}
        submitting={submitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        website={website}
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setDeleteError('');
        }}
        onConfirm={handleDelete}
        deleting={deleting}
        error={deleteError}
      />
    </div>
  );
}


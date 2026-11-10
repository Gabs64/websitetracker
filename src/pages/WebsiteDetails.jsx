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
  Banknote,
  Sparkles,
  FileCode2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchWebsiteById,
  updateWebsite,
  deleteWebsite,
  parseTechStack,
  normalizeUrl,
} from '../lib/sheets';
import {
  formatCurrency,
  getPreferredCurrency,
  getLanguageColor,
  analyzeGitHubRepository,
  generateAiWebsiteValuation,
} from '../lib/githubAndAi';
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

  // Edit, Sync & Delete Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [syncingGithub, setSyncingGithub] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const currency = getPreferredCurrency();

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

  // One-click refresh of GitHub languages & AI valuation directly from Details view
  const handleSyncGitHubAndValuation = async () => {
    if (!user || !website) return;
    setSyncingGithub(true);
    try {
      let languages = Array.isArray(website.languages) ? website.languages : [];
      let metrics = null;
      let mergedTech = website.tech_stack || '';

      if (website.repository_url) {
        const ghRes = await analyzeGitHubRepository(website.repository_url);
        if (ghRes.ok) {
          languages = ghRes.languages;
          metrics = ghRes.metrics;
          const existingTech = parseTechStack(website.tech_stack);
          const detectedTech = parseTechStack(ghRes.suggestedTechStack);
          mergedTech = Array.from(new Set([...existingTech, ...detectedTech])).join(', ');
        }
      }

      const valuation = await generateAiWebsiteValuation({
        name: website.name,
        description: website.description,
        fsdDetails: website.fsd_details,
        techStack: mergedTech,
        languages,
        repoMetrics: metrics,
        currency,
      });

      const nextPrice =
        Number(website.price) > 0
          ? Number(website.price)
          : currency === 'USD'
          ? valuation.recommendedPriceUSD
          : valuation.recommendedPricePHP;

      const { data } = await updateWebsite(website.id, user.id, {
        ...website,
        tech_stack: mergedTech,
        price: nextPrice,
        languages,
        valuation,
      });

      if (data) {
        setWebsite(data);
      }
    } finally {
      setSyncingGithub(false);
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
  const languages = Array.isArray(website.languages) ? website.languages : [];
  const valuation = website.valuation || null;

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

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncGitHubAndValuation}
            disabled={syncingGithub}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 hover:bg-indigo-100 dark:text-indigo-300 dark:hover:bg-indigo-950/70 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncingGithub ? 'animate-spin' : ''}`} />
            <span>
              {syncingGithub ? 'Analyzing...' : 'Sync GitHub & AI Valuation'}
            </span>
          </button>

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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {website.name}
                </h1>
                <StatusBadge status={website.status} />
                {Number(website.price) > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70">
                    <Banknote className="w-3.5 h-3.5" />
                    {formatCurrency(website.price, currency)}
                  </span>
                )}
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
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
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

          {/* Project Price */}
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Banknote className="w-3.5 h-3.5" />
              Website Price ({currency})
            </span>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {Number(website.price) > 0
                ? formatCurrency(website.price, currency)
                : 'Not set — Click "Sync GitHub & AI Valuation" or "Edit"'}
            </p>
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

        {/* Content Sections */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* 1. GitHub Repository Languages & Percentages */}
          {languages.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                <FileCode2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Repository Languages & Percentages</span>
              </h2>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3.5">
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
                  {languages.map((lang) => (
                    <div
                      key={lang.name}
                      style={{
                        width: `${Math.max(lang.percentage, 1.5)}%`,
                        backgroundColor: getLanguageColor(lang.name),
                      }}
                      title={`${lang.name}: ${lang.percentage}%`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {languages.map((lang) => (
                    <div
                      key={lang.name}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs"
                    >
                      <span className="inline-flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: getLanguageColor(lang.name) }}
                        />
                        {lang.name}
                      </span>
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        {lang.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. Technology Stack */}
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

          {/* 3. AI Price Breakdown & Valuation Report */}
          {valuation && (
            <div>
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>AI Website Classification & Price Valuation Report</span>
              </h2>
              <div className="rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white">
                      {valuation.detectedCategory}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                      Complexity: {valuation.complexityLevel} (~{valuation.estimatedHours} hrs)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      AI Recommended Valuation
                    </span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(
                        currency === 'USD'
                          ? valuation.recommendedPriceUSD
                          : valuation.recommendedPricePHP,
                        currency
                      )}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {valuation.summary}
                </p>

                {Array.isArray(valuation.breakdown) && valuation.breakdown.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase">
                          <th className="py-2.5 px-4">Component / Module</th>
                          <th className="py-2.5 px-4">Est. Hours</th>
                          <th className="py-2.5 px-4 text-right">Valuation ({currency})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {valuation.breakdown.map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-4">
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {row.item}
                              </p>
                              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                                {row.description}
                              </p>
                            </td>
                            <td className="py-2.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                              {row.hours} hrs
                            </td>
                            <td className="py-2.5 px-4 whitespace-nowrap text-right font-semibold text-slate-900 dark:text-white">
                              {formatCurrency(
                                currency === 'USD' ? row.amountUSD : row.amountPHP,
                                currency
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Website Details / Functional Specification Document (FSD) */}
          <div>
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Website Details / Functional Specification Document (FSD)</span>
            </h2>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 max-h-96 overflow-y-auto">
              {website.fsd_details ? (
                <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {website.fsd_details}
                </pre>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                  No FSD or detailed specification recorded yet. Click &ldquo;Edit Project&rdquo; to paste the website FSD or specifications.
                </p>
              )}
            </div>
          </div>

          {/* 5. Personal Notes */}
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
                  No personal notes added for this project yet.
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

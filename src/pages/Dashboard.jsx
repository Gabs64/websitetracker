import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Code2,
  Rocket,
  Archive,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  ExternalLink,
  ArrowUpRight,
  Pencil,
  Trash2,
  AlertCircle,
  RefreshCw,
  Banknote,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GitBranch,
  Sparkles,
  Monitor,
  Play,
  Pause,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchWebsites,
  createWebsite,
  updateWebsite,
  deleteWebsite,
  computeSummaryStats,
  filterWebsites,
  WEBSITE_STATUSES,
  normalizeUrl,
  parseTechStack,
} from '../lib/sheets';
import {
  formatCurrency,
  getPreferredCurrency,
  getLanguageColor,
} from '../lib/githubAndAi';
import WebsiteCard, { formatDate } from '../components/WebsiteCard';
import WebsiteForm, {
  DeleteConfirmModal,
  ProjectPreviewModal,
} from '../components/WebsiteForm';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const { user } = useAuth();
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Hero Spotlight Index for Websites with Links
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [showClearPreview, setShowClearPreview] = useState(false);
  const [bgScreenshotFallback, setBgScreenshotFallback] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // Quick Actions: Search, Filter, Layout
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('mwt_default_view') || 'grid';
  });

  // Modals: Add / Edit / Delete / Quick Preview
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [deletingWebsite, setDeletingWebsite] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [previewWebsite, setPreviewWebsite] = useState(null);

  const currency = getPreferredCurrency();

  const loadWebsites = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: fetchErr } = await fetchWebsites();
    if (fetchErr) {
      setError(fetchErr);
    } else {
      setWebsites(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWebsites();
  }, [loadWebsites]);

  // All websites that have a Website URL (link) configured
  const liveWebsites = useMemo(() => {
    return websites.filter((w) => Boolean(normalizeUrl(w.website_url)));
  }, [websites]);

  useEffect(() => {
    if (spotlightIndex >= liveWebsites.length) {
      setSpotlightIndex(0);
    }
    setBgScreenshotFallback(false);
  }, [liveWebsites.length, spotlightIndex]);

  // Auto-Next rotation for Hero Section (every 7 seconds, pauses on hover or open modal)
  useEffect(() => {
    if (
      !autoPlay ||
      isHeroHovered ||
      liveWebsites.length <= 1 ||
      isFormOpen ||
      Boolean(previewWebsite) ||
      Boolean(deletingWebsite)
    ) {
      return undefined;
    }

    const timer = setInterval(() => {
      setSpotlightIndex((prev) =>
        prev === liveWebsites.length - 1 ? 0 : prev + 1
      );
    }, 7000);

    return () => clearInterval(timer);
  }, [
    autoPlay,
    isHeroHovered,
    liveWebsites.length,
    isFormOpen,
    previewWebsite,
    deletingWebsite,
  ]);

  const activeSpotlight = liveWebsites[spotlightIndex] || null;
  const spotlightLiveUrl = normalizeUrl(activeSpotlight?.website_url);
  const spotlightScreenshotUrl = spotlightLiveUrl
    ? bgScreenshotFallback
      ? `https://s0.wp.com/mshots/v1/${encodeURIComponent(spotlightLiveUrl)}?w=1600&h=900`
      : `https://image.thum.io/get/width/1600/crop/900/noanimate/${spotlightLiveUrl}`
    : '';

  const stats = computeSummaryStats(websites);
  const filteredWebsites = filterWebsites(websites, searchQuery, statusFilter);

  const handleOpenAdd = () => {
    setEditingWebsite(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (website) => {
    setEditingWebsite(website);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    if (!user) return { error: 'Not authenticated.' };
    setSubmitting(true);
    try {
      if (editingWebsite?.id) {
        const { data, error: updateErr } = await updateWebsite(
          editingWebsite.id,
          user.id,
          payload
        );
        if (updateErr) return { error: updateErr };
        setWebsites((prev) => prev.map((w) => (w.id === data.id ? data : w)));
      } else {
        const { data, error: createErr } = await createWebsite(user.id, payload);
        if (createErr) return { error: createErr };
        setWebsites((prev) => [data, ...prev]);
      }
      setIsFormOpen(false);
      setEditingWebsite(null);
      return { error: null };
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingWebsite || !user) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const { error: delErr } = await deleteWebsite(deletingWebsite.id, user.id);
      if (delErr) {
        setDeleteError(delErr);
        return;
      }
      setWebsites((prev) => prev.filter((w) => w.id !== deletingWebsite.id));
      setDeletingWebsite(null);
    } finally {
      setDeleting(false);
    }
  };

  const summaryCards = [
    {
      label: 'Total Websites',
      value: stats.total,
      icon: Globe,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/50',
      filterKey: 'ALL',
    },
    {
      label: 'In Development',
      value: stats.inDevelopment,
      icon: Code2,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      filterKey: 'ACTIVE_DEV',
    },
    {
      label: 'Deployed / Live',
      value: stats.deployedLive,
      icon: Rocket,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      filterKey: 'Deployed / Live',
    },
    {
      label: 'Completed / Archived',
      value: stats.completedArchived,
      icon: Archive,
      color: 'text-slate-600 dark:text-slate-400',
      bg: 'bg-slate-100 dark:bg-slate-800',
      filterKey: 'Archived',
    },
    {
      label: `Portfolio Value (${currency})`,
      value:
        stats.totalValue > 0
          ? formatCurrency(stats.totalValue, currency)
          : `${currency === 'USD' ? '$0' : '₱0'}`,
      icon: Banknote,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      filterKey: 'ALL',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Centralized overview of your personal website projects, valuations, and live deployments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadWebsites}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title="Refresh projects"
            aria-label="Refresh projects"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Website</span>
          </button>
        </div>
      </div>

      {/* HERO SECTION: Live & Deployed Websites Showcase with Live Website Preview Background */}
      {!loading && (
        <section
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
          className="relative overflow-hidden rounded-2xl bg-slate-950 text-white border border-indigo-500/30 shadow-xl animate-slide-up min-h-[340px]"
        >
          {/* Live Website Preview Background Layer */}
          {spotlightLiveUrl ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
              {/* Layer 1: Live Website Screenshot Fallback/Backdrop */}
              <img
                key={`bg-img-${spotlightLiveUrl}-${bgScreenshotFallback}`}
                src={spotlightScreenshotUrl}
                alt={`${activeSpotlight?.name || 'Website'} live preview`}
                onError={() => {
                  if (!bgScreenshotFallback) {
                    setBgScreenshotFallback(true);
                  }
                }}
                className={`w-full h-full object-cover object-top transition-all duration-700 ${
                  showClearPreview
                    ? 'scale-100 opacity-95'
                    : 'scale-[1.02] opacity-65'
                }`}
              />
              {/* Layer 2: Live Rendered Website Iframe Background */}
              <iframe
                key={`bg-iframe-${spotlightLiveUrl}`}
                src={spotlightLiveUrl}
                title={`${activeSpotlight?.name || 'Live Website'} Background Preview`}
                tabIndex={-1}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin"
                className={`absolute inset-0 w-[125%] h-[125%] origin-top-left scale-[0.8] border-0 transition-opacity duration-700 pointer-events-none ${
                  showClearPreview ? 'opacity-95' : 'opacity-60'
                }`}
              />
              {/* Layer 3: Readability Gradient Overlay */}
              <div
                className={`absolute inset-0 transition-all duration-500 ${
                  showClearPreview
                    ? 'bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/50'
                    : 'bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/35'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40" />
            </div>
          ) : (
            <>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900" />
              <div
                className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-500/15 blur-3xl"
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl"
                aria-hidden="true"
              />
            </>
          )}

          <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between min-h-[340px]">
            {/* Hero Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/15">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>WEBSITE PREVIEW SHOWCASE</span>
                </span>
                <span className="text-xs font-medium text-slate-200 bg-slate-900/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                  {liveWebsites.length}{' '}
                  {liveWebsites.length === 1
                    ? 'Website with Link'
                    : 'Websites with Links'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {spotlightLiveUrl && (
                  <button
                    type="button"
                    onClick={() => setShowClearPreview((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900/70 hover:bg-slate-900/90 text-slate-200 border border-white/15 backdrop-blur-md transition-colors cursor-pointer"
                    title="Toggle clear background preview"
                  >
                    {showClearPreview ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-indigo-300" />
                        <span>Show Details Overlay</span>
                      </>
                    ) : (
                      <>
                        <Monitor className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Peek Full Background</span>
                      </>
                    )}
                  </button>
                )}

                {liveWebsites.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-1.5 py-1 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setAutoPlay((prev) => !prev)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                        autoPlay
                          ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                      title={
                        autoPlay
                          ? 'Auto-Next is ON (pauses on hover) — click to pause'
                          : 'Auto-Next is PAUSED — click to resume'
                      }
                      aria-label={autoPlay ? 'Pause auto-next' : 'Resume auto-next'}
                    >
                      {autoPlay ? (
                        <>
                          <Pause className="w-3 h-3" />
                          <span className="hidden sm:inline">
                            {isHeroHovered ? 'Paused' : 'Auto'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          <span className="hidden sm:inline">Paused</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSpotlightIndex((prev) =>
                          prev === 0 ? liveWebsites.length - 1 : prev - 1
                        )
                      }
                      className="p-1 rounded-md hover:bg-white/20 text-white transition-colors cursor-pointer"
                      aria-label="Previous live website"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-medium text-slate-200 px-1.5">
                      {spotlightIndex + 1} / {liveWebsites.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSpotlightIndex((prev) =>
                          prev === liveWebsites.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="p-1 rounded-md hover:bg-white/20 text-white transition-colors cursor-pointer"
                      aria-label="Next live website"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {activeSpotlight ? (
              <div className="mt-6 space-y-6">
                {/* Spotlight Main Row */}
                <div
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-center transition-opacity duration-300 ${
                    showClearPreview ? 'opacity-15 hover:opacity-100' : 'opacity-100'
                  }`}
                >
                  <div className="lg:col-span-7 space-y-3.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-sm">
                        {activeSpotlight.name}
                      </h2>
                      <StatusBadge status={activeSpotlight.status} />
                      {Number(activeSpotlight.price) > 0 && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 backdrop-blur-md">
                          <Banknote className="w-3.5 h-3.5" />
                          {formatCurrency(activeSpotlight.price, currency)}
                        </span>
                      )}
                      {activeSpotlight.valuation?.detectedCategory && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/30 text-indigo-100 border border-indigo-400/40 backdrop-blur-md">
                          <Sparkles className="w-3 h-3" />
                          {activeSpotlight.valuation.detectedCategory}
                        </span>
                      )}
                    </div>

                    <p className="text-sm sm:text-base text-slate-100/95 leading-relaxed max-w-2xl drop-shadow-xs">
                      {activeSpotlight.description || 'Deployed live web application.'}
                    </p>

                    {/* Spotlight Tech Stack */}
                    {parseTechStack(activeSpotlight.tech_stack).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {parseTechStack(activeSpotlight.tech_stack).map((tech) => (
                          <span
                            key={tech}
                            className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-900/70 text-slate-100 border border-white/15 backdrop-blur-md"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Spotlight Action Buttons */}
                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      {spotlightLiveUrl ? (
                        <a
                          href={spotlightLiveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md transition-all"
                        >
                          <Globe className="w-4 h-4" />
                          <span>Visit Live Site</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setPreviewWebsite(activeSpotlight)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900/75 hover:bg-slate-900 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Quick Inspector</span>
                      </button>

                      {normalizeUrl(activeSpotlight.repository_url) && (
                        <a
                          href={normalizeUrl(activeSpotlight.repository_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-slate-900/65 hover:bg-slate-900/90 text-slate-200 border border-white/15 backdrop-blur-md transition-all"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>Repo</span>
                        </a>
                      )}

                      <Link
                        to={`/websites/${activeSpotlight.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-medium text-indigo-200 hover:text-white bg-slate-900/50 hover:bg-slate-900/80 border border-white/10 backdrop-blur-md transition-colors"
                      >
                        <span>Full Details</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Right Column: Live Website Mini-Browser Window + Languages */}
                  <div className="lg:col-span-5">
                    <div className="rounded-xl overflow-hidden border border-white/20 bg-slate-950/80 backdrop-blur-md shadow-2xl">
                      {/* Browser Top Bar */}
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/90 border-b border-white/10">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                        </div>
                        <div className="flex-1 mx-2 px-2.5 py-0.5 rounded bg-slate-950/90 border border-white/10 text-[11px] text-slate-300 truncate text-center">
                          {spotlightLiveUrl
                            ? spotlightLiveUrl.replace(/^https?:\/\//i, '')
                            : 'No live URL configured'}
                        </div>
                        {spotlightLiveUrl && (
                          <a
                            href={spotlightLiveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-emerald-300 transition-colors"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Browser Viewport Preview */}
                      {spotlightLiveUrl ? (
                        <a
                          href={spotlightLiveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block h-44 sm:h-48 w-full overflow-hidden bg-slate-900"
                        >
                          <img
                            src={spotlightScreenshotUrl}
                            alt={`${activeSpotlight.name} preview`}
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                          />
                          <iframe
                            src={spotlightLiveUrl}
                            title={`${activeSpotlight.name} mini preview`}
                            tabIndex={-1}
                            loading="lazy"
                            sandbox="allow-scripts allow-same-origin"
                            className="pointer-events-none absolute inset-0 w-[200%] h-[200%] origin-top-left scale-50 border-0"
                          />
                          <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/40 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 shadow-lg">
                              <span>Launch Website</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </a>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-xs text-slate-400 p-4 text-center">
                          Add a Live Website URL to preview this deployment.
                        </div>
                      )}

                      {/* Codebase Languages Bar */}
                      {Array.isArray(activeSpotlight.languages) &&
                        activeSpotlight.languages.length > 0 && (
                          <div className="p-3 bg-slate-900/90 border-t border-white/10 space-y-1.5">
                            <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-white/10">
                              {activeSpotlight.languages.map((lang) => (
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
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-300">
                              {activeSpotlight.languages.slice(0, 4).map((lang) => (
                                <span
                                  key={lang.name}
                                  className="inline-flex items-center gap-1"
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: getLanguageColor(lang.name),
                                    }}
                                  />
                                  <span>{lang.name}</span>
                                  <span className="text-slate-400">
                                    {lang.percentage}%
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>

                {/* Strip of All Websites with Website Links */}
                {liveWebsites.length > 0 && (
                  <div className="pt-4 border-t border-white/15">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-2.5">
                      All Websites with Links ({liveWebsites.length})
                    </p>
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                      {liveWebsites.map((site, idx) => {
                        const isCurrent = idx === spotlightIndex;
                        return (
                          <button
                            key={site.id}
                            type="button"
                            onClick={() => setSpotlightIndex(idx)}
                            className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-left text-xs transition-all shrink-0 cursor-pointer border backdrop-blur-md ${
                              isCurrent
                                ? 'bg-white text-slate-900 border-white font-semibold shadow-sm'
                                : 'bg-slate-900/65 hover:bg-slate-900/90 text-slate-100 border-white/15'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isCurrent ? 'bg-emerald-500' : 'bg-emerald-400/70'
                              }`}
                            />
                            <span className="truncate max-w-[160px]">{site.name}</span>
                            {Number(site.price) > 0 && (
                              <span
                                className={`text-[11px] px-1.5 py-0.5 rounded ${
                                  isCurrent
                                    ? 'bg-slate-100 text-emerald-700'
                                    : 'bg-white/10 text-emerald-300'
                                }`}
                              >
                                {formatCurrency(site.price, currency)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    No Websites with a Website URL Yet
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-xl">
                    Add a <span className="text-emerald-300 font-medium">Website URL</span> to any
                    project and it will automatically appear here in your Hero Showcase with a live
                    website preview background.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Website with Link</span>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const isSelected = statusFilter === card.filterKey && card.filterKey !== 'ALL';
          return (
            <button
              key={card.label}
              type="button"
              onClick={() =>
                setStatusFilter((prev) =>
                  prev === card.filterKey ? 'ALL' : card.filterKey
                )
              }
              className={`text-left bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-indigo-500 ring-1 ring-indigo-500'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.label}
                </span>
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="mt-3 text-xl font-bold text-slate-900 dark:text-white truncate">
                {loading ? '—' : card.value}
              </p>
            </button>
          );
        })}
      </div>

      {/* Quick Actions Bar: Search, Status Filter, View Toggle */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search websites by name, description, FSD, or tech stack..."
            aria-label="Search websites"
            className="w-full pl-10 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Status Filter & Layout Switch */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:flex-initial">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter websites by status"
              className="w-full sm:w-auto pl-8 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE_DEV">All In Development (Planning / Dev / Testing)</option>
              {WEBSITE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Card View"
              aria-label="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Table View"
              aria-label="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 flex items-center gap-3 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Website Projects Section */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-52 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-5 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-800/60 rounded" />
                <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </div>
              <div className="h-4 w-1/3 bg-slate-100 dark:bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>
      ) : filteredWebsites.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center animate-slide-up">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {websites.length === 0
              ? 'No website projects registered yet'
              : 'No matching websites found'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {websites.length === 0
              ? 'Start tracking your personal websites by adding your first project.'
              : 'Try adjusting your search query or clearing the status filter.'}
          </p>
          {websites.length === 0 ? (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Website</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredWebsites.map((website) => (
            <WebsiteCard
              key={website.id}
              website={website}
              onPreview={setPreviewWebsite}
              onEdit={handleOpenEdit}
              onDelete={(site) => {
                setDeleteError('');
                setDeletingWebsite(site);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden animate-slide-up">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Website</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Price ({currency})</th>
                  <th className="py-3.5 px-4">Top Languages</th>
                  <th className="py-3.5 px-4">Website URL</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredWebsites.map((website) => {
                  const liveUrl = normalizeUrl(website.website_url);
                  const langs = Array.isArray(website.languages) ? website.languages : [];
                  return (
                    <tr
                      key={website.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 max-w-xs">
                        <Link
                          to={`/websites/${website.id}`}
                          className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 block truncate"
                        >
                          {website.name}
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {website.description}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={website.status} />
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {Number(website.price) > 0
                          ? formatCurrency(website.price, currency)
                          : '—'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        {langs.length > 0 ? (
                          <div className="flex items-center gap-2">
                            {langs.slice(0, 2).map((l) => (
                              <span
                                key={l.name}
                                className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300"
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: getLanguageColor(l.name) }}
                                />
                                {l.name} {l.percentage}%
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                        {liveUrl ? (
                          <a
                            href={liveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <span>{website.website_url.replace(/^https?:\/\//i, '')}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(website.updated_at || website.created_at)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewWebsite(website)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/40 cursor-pointer"
                            title="Quick Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(website)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError('');
                              setDeletingWebsite(website);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            to={`/websites/${website.id}`}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                            title="View Details"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Quick Preview Modal */}
      <ProjectPreviewModal
        website={previewWebsite}
        isOpen={Boolean(previewWebsite)}
        onClose={() => setPreviewWebsite(null)}
        onEdit={handleOpenEdit}
      />

      {/* Add / Edit Modal */}
      <WebsiteForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingWebsite(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingWebsite}
        submitting={submitting}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        website={deletingWebsite}
        isOpen={Boolean(deletingWebsite)}
        onClose={() => {
          setDeletingWebsite(null);
          setDeleteError('');
        }}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
        error={deleteError}
      />
    </div>
  );
}

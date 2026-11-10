import React, { useState, useEffect, useCallback } from 'react';
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
} from '../lib/sheets';
import WebsiteCard, { formatDate } from '../components/WebsiteCard';
import WebsiteForm, { DeleteConfirmModal } from '../components/WebsiteForm';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const { user } = useAuth();
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Quick Actions: Search, Filter, Layout
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('mwt_default_view') || 'grid';
  });

  // Modals: Add / Edit / Delete
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [deletingWebsite, setDeletingWebsite] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Centralized overview of your personal website projects and deployment status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadWebsites}
            disabled={loading}
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh projects"
            aria-label="Refresh projects"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Website</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
              className={`text-left bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-xs transition-all cursor-pointer ${
                isSelected
                  ? 'border-indigo-500 ring-1 ring-indigo-500'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.label}
                </span>
                <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                {loading ? '—' : card.value}
              </p>
            </button>
          );
        })}
      </div>

      {/* Quick Actions Bar: Search, Status Filter, View Toggle */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search websites by name, description, or tech stack..."
            aria-label="Search websites"
            className="w-full pl-10 pr-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full sm:w-auto pl-8 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
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
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
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
              className="h-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse flex flex-col justify-between"
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
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
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
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
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
              onEdit={handleOpenEdit}
              onDelete={(site) => {
                setDeleteError('');
                setDeletingWebsite(site);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4">Website</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Website URL</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {filteredWebsites.map((website) => {
                  const liveUrl = normalizeUrl(website.website_url);
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


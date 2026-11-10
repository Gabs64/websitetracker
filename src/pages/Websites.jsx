import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Globe,
  Plus,
  Search,
  ArrowUpDown,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchWebsites,
  createWebsite,
  updateWebsite,
  deleteWebsite,
  filterWebsites,
  WEBSITE_STATUSES,
} from '../lib/sheets';
import WebsiteCard from '../components/WebsiteCard';
import WebsiteForm, {
  DeleteConfirmModal,
  ProjectPreviewModal,
} from '../components/WebsiteForm';

const QUICK_FILTER_TABS = [
  { id: 'ALL', label: 'All Websites' },
  { id: 'In Development', label: 'In Development' },
  { id: 'Deployed / Live', label: 'Live Websites' },
  { id: 'Maintenance', label: 'Maintenance' },
  { id: 'Planning', label: 'Planning' },
  { id: 'Testing', label: 'Testing' },
  { id: 'Archived', label: 'Archived' },
];

export default function Websites() {
  const { user } = useAuth();
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('updated_desc');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [deletingWebsite, setDeletingWebsite] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [previewWebsite, setPreviewWebsite] = useState(null);

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

  const statusCounts = useMemo(() => {
    const counts = { ALL: websites.length };
    WEBSITE_STATUSES.forEach((s) => {
      counts[s] = 0;
    });
    websites.forEach((site) => {
      if (counts[site.status] !== undefined) {
        counts[site.status] += 1;
      }
    });
    return counts;
  }, [websites]);

  const processedWebsites = useMemo(() => {
    const filtered = filterWebsites(websites, searchQuery, selectedStatus);
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'created_desc') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return (
        new Date(b.updated_at || b.created_at || 0) -
        new Date(a.updated_at || a.created_at || 0)
      );
    });
  }, [websites, searchQuery, selectedStatus, sortBy]);

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            My Websites
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage, search, and filter all of your personal website projects.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingWebsite(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Website</span>
        </button>
      </div>

      {/* Status Filter Tabs (FR-010) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {QUICK_FILTER_TABS.map((tab) => {
          const active = selectedStatus === tab.id;
          const count = statusCounts[tab.id] ?? 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                  active
                    ? 'bg-indigo-700 text-indigo-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Sort Bar (FR-009) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by website name, description, or technology stack..."
            aria-label="Search websites"
            className="w-full pl-10 pr-9 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort websites"
              className="w-full sm:w-auto pl-8 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="updated_desc">Recently Updated</option>
              <option value="created_desc">Newest Created</option>
              <option value="name_asc">Name (A–Z)</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 flex items-center gap-3 text-sm text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 animate-pulse"
            />
          ))}
        </div>
      ) : processedWebsites.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {websites.length === 0
              ? 'Your website directory is empty'
              : 'No projects match your current filter'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {websites.length === 0
              ? 'Click "Add Website" to register your first personal website project.'
              : 'Try clearing your search term or switching to "All Websites".'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {processedWebsites.map((website) => (
            <WebsiteCard
              key={website.id}
              website={website}
              onPreview={(site) => setPreviewWebsite(site)}
              onEdit={(site) => {
                setEditingWebsite(site);
                setIsFormOpen(true);
              }}
              onDelete={(site) => {
                setDeleteError('');
                setDeletingWebsite(site);
              }}
            />
          ))}
        </div>
      )}

      {/* Quick Preview Inspector Modal */}
      <ProjectPreviewModal
        website={previewWebsite}
        isOpen={Boolean(previewWebsite)}
        onClose={() => setPreviewWebsite(null)}
        onEdit={(site) => {
          setEditingWebsite(site);
          setIsFormOpen(true);
        }}
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


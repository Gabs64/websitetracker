import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Globe, GitBranch, Layers, Trash2 } from 'lucide-react';
import {
  WEBSITE_STATUSES,
  validateUrl,
  formatTechStack,
  parseTechStack,
} from '../lib/sheets';

export function DeleteConfirmModal({
  website,
  isOpen,
  onClose,
  onConfirm,
  deleting = false,
  error = '',
}) {
  if (!isOpen || !website) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3
              id="delete-modal-title"
              className="text-base font-semibold text-slate-900 dark:text-white"
            >
              Delete Website Project
            </h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {website.name}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

const INITIAL_VALUES = {
  name: '',
  description: '',
  website_url: '',
  repository_url: '',
  tech_stack: '',
  status: 'Planning',
  notes: '',
};

export default function WebsiteForm({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  submitting = false,
}) {
  const [formData, setFormData] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const isEditMode = Boolean(initialData?.id);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        website_url: initialData.website_url || '',
        repository_url: initialData.repository_url || '',
        tech_stack: Array.isArray(initialData.tech_stack)
          ? initialData.tech_stack.join(', ')
          : initialData.tech_stack || '',
        status: WEBSITE_STATUSES.includes(initialData.status)
          ? initialData.status
          : 'Planning',
        notes: initialData.notes || '',
      });
    } else {
      setFormData(INITIAL_VALUES);
    }
    setErrors({});
    setSubmitError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = 'Website name is required.';
    } else if (formData.name.trim().length > 120) {
      nextErrors.name = 'Website name must be 120 characters or fewer.';
    }

    if (!formData.description.trim()) {
      nextErrors.description = 'Short project description is required.';
    }

    if (!formData.tech_stack.trim()) {
      nextErrors.tech_stack = 'Please specify at least one technology (e.g., React, Tailwind CSS).';
    }

    if (!WEBSITE_STATUSES.includes(formData.status)) {
      nextErrors.status = 'Please select a valid development status.';
    }

    const webUrlCheck = validateUrl(formData.website_url);
    if (!webUrlCheck.valid) {
      nextErrors.website_url = webUrlCheck.error;
    }

    const repoUrlCheck = validateUrl(formData.repository_url);
    if (!repoUrlCheck.valid) {
      nextErrors.repository_url = repoUrlCheck.error;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    const webUrlCheck = validateUrl(formData.website_url);
    const repoUrlCheck = validateUrl(formData.repository_url);

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      website_url: webUrlCheck.value,
      repository_url: repoUrlCheck.value,
      tech_stack: formatTechStack(formData.tech_stack),
      status: formData.status,
      notes: formData.notes.trim(),
    };

    const result = await onSubmit(payload);
    if (result?.error) {
      setSubmitError(result.error);
    }
  };

  const previewTags = parseTechStack(formData.tech_stack);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="website-form-title"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2
              id="website-form-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              {isEditMode ? 'Edit Website Project' : 'Add Website Project'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEditMode
                ? 'Update project details, links, status, or personal notes.'
                : 'Register a new website project in your private dashboard.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Website Name & Status Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="website-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Website Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="website-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Personal Portfolio v3"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.name}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="website-status"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Status <span className="text-rose-500">*</span>
              </label>
              <select
                id="website-status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {WEBSITE_STATUSES.map((statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {statusOption}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.status}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="website-description"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="website-description"
              name="description"
              rows={2}
              value={formData.description}
              onChange={handleChange}
              placeholder="Short summary of what this website does and its primary goal..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.description}</p>
            )}
          </div>

          {/* URLs (Optional while under development) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="website-url"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Website URL</span>
                <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                id="website-url"
                name="website_url"
                type="text"
                value={formData.website_url}
                onChange={handleChange}
                placeholder="https://example.com"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.website_url && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {errors.website_url}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="repository-url"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                <span>Repository URL</span>
                <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                id="repository-url"
                name="repository_url"
                type="text"
                value={formData.repository_url}
                onChange={handleChange}
                placeholder="https://github.com/username/repo"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.repository_url && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {errors.repository_url}
                </p>
              )}
            </div>
          </div>

          {/* Technology Stack */}
          <div>
            <label
              htmlFor="tech-stack"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Technology Stack</span>
              <span className="text-rose-500">*</span>
              <span className="text-[11px] font-normal text-slate-400">
                (Comma-separated)
              </span>
            </label>
            <input
              id="tech-stack"
              name="tech_stack"
              type="text"
              value={formData.tech_stack}
              onChange={handleChange}
              placeholder="React, Vite, Tailwind CSS, Supabase, Vercel"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.tech_stack && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{errors.tech_stack}</p>
            )}
            {previewTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {previewTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="website-notes"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Personal Notes{' '}
              <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
            </label>
            <textarea
              id="website-notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Hosting details, domain renewal dates, upcoming tasks, or environment reminders..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting
                ? isEditMode
                  ? 'Saving Changes...'
                  : 'Adding Website...'
                : isEditMode
                ? 'Save Changes'
                : 'Add Website'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

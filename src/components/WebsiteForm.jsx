import React, { useState, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Globe,
  GitBranch,
  Layers,
  Trash2,
  Sparkles,
  RefreshCw,
  FileCode2,
  Banknote,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import {
  WEBSITE_STATUSES,
  validateUrl,
  formatTechStack,
  parseTechStack,
} from '../lib/sheets';
import {
  analyzeGitHubRepository,
  generateAiWebsiteValuation,
  getPreferredCurrency,
  formatCurrency,
  getLanguageColor,
} from '../lib/githubAndAi';

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
  price: '',
  fsd_details: '',
  notes: '',
  languages: [],
  valuation: null,
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

  // GitHub & AI states
  const [analyzingRepo, setAnalyzingRepo] = useState(false);
  const [repoMessage, setRepoMessage] = useState({ type: '', text: '' });
  const [repoMetrics, setRepoMetrics] = useState(null);
  const [estimatingPrice, setEstimatingPrice] = useState(false);

  const currency = getPreferredCurrency();
  const currencySymbol = currency === 'USD' ? '$' : '₱';
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
        price:
          initialData.price !== undefined && Number(initialData.price) > 0
            ? String(initialData.price)
            : '',
        fsd_details: initialData.fsd_details || '',
        notes: String(initialData.notes || '').split('<!--MWT_META:')[0].trim(),
        languages: Array.isArray(initialData.languages) ? initialData.languages : [],
        valuation: initialData.valuation || null,
      });
    } else {
      setFormData(INITIAL_VALUES);
    }
    setErrors({});
    setSubmitError('');
    setRepoMessage({ type: '', text: '' });
    setRepoMetrics(null);
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
      nextErrors.tech_stack =
        'Please specify at least one technology (e.g., React, Tailwind CSS).';
    }

    if (!formData.fsd_details.trim()) {
      nextErrors.fsd_details =
        'Website Details / Functional Specification Document (FSD) is required.';
    }

    if (!WEBSITE_STATUSES.includes(formData.status)) {
      nextErrors.status = 'Please select a valid development status.';
    }

    if (formData.price !== '' && (Number.isNaN(Number(formData.price)) || Number(formData.price) < 0)) {
      nextErrors.price = 'Please enter a valid non-negative price.';
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

  // Analyze Public GitHub Repository: fetch languages %, description, tech stack & README
  const handleAnalyzeGitHub = async () => {
    setRepoMessage({ type: '', text: '' });
    if (!formData.repository_url.trim()) {
      setRepoMessage({
        type: 'error',
        text: 'Enter a public GitHub repository URL first to fetch languages and project info.',
      });
      return;
    }

    setAnalyzingRepo(true);
    try {
      const res = await analyzeGitHubRepository(formData.repository_url);
      if (!res.ok) {
        setRepoMessage({ type: 'error', text: res.error });
        return;
      }

      setRepoMetrics(res.metrics);

      const nextName = formData.name.trim() || res.suggestedName;
      const nextDesc = formData.description.trim() || res.suggestedDescription;
      const nextWebUrl = formData.website_url.trim() || res.suggestedHomepage || '';

      // Merge existing tech stack with detected GitHub tech stack
      const existingTech = parseTechStack(formData.tech_stack);
      const detectedTech = parseTechStack(res.suggestedTechStack);
      const mergedTech = Array.from(new Set([...existingTech, ...detectedTech])).join(', ');

      setFormData((prev) => ({
        ...prev,
        name: nextName,
        description: nextDesc,
        website_url: nextWebUrl,
        tech_stack: mergedTech,
        languages: res.languages,
      }));

      setRepoMessage({
        type: 'success',
        text: `Synced ${res.languages.length} language(s), tech stack, and description from ${res.owner}/${res.repo}. Fill in the FSD below and click "Groq AI Auto-Detect Price" to calculate pricing from your FSD.`,
      });
    } finally {
      setAnalyzingRepo(false);
    }
  };

  // Groq AI Auto-Detect Website Category, Price & Breakdown strictly from FSD/Details
  const handleAiAutoDetectPrice = async () => {
    setRepoMessage({ type: '', text: '' });
    setSubmitError('');

    if (!formData.fsd_details.trim()) {
      setErrors((prev) => ({
        ...prev,
        fsd_details:
          'Please fill in the Website Details / FSD first so Groq AI can base the price on it.',
      }));
      setSubmitError(
        'Website Details / Functional Specification Document (FSD) must be filled in before running Groq AI Price Auto-Detection.'
      );
      return;
    }

    setEstimatingPrice(true);
    try {
      let currentLanguages = formData.languages;
      let currentMetrics = repoMetrics;

      // If a GitHub URL is present and languages haven't been fetched yet, fetch them automatically
      if (
        formData.repository_url.trim() &&
        (!currentLanguages || currentLanguages.length === 0)
      ) {
        const ghRes = await analyzeGitHubRepository(formData.repository_url);
        if (ghRes.ok) {
          currentLanguages = ghRes.languages;
          currentMetrics = ghRes.metrics;
          setRepoMetrics(ghRes.metrics);
        }
      }

      const valuationReport = await generateAiWebsiteValuation({
        name: formData.name,
        description: formData.description,
        fsdDetails: formData.fsd_details,
        techStack: formData.tech_stack,
        languages: currentLanguages,
        repoMetrics: currentMetrics,
        currency,
      });

      const recommendedPrice =
        currency === 'USD'
          ? valuationReport.recommendedPriceUSD
          : valuationReport.recommendedPricePHP;

      setFormData((prev) => ({
        ...prev,
        languages: currentLanguages,
        valuation: valuationReport,
        price: String(recommendedPrice),
      }));
    } catch (err) {
      setSubmitError(err?.message || 'Groq AI valuation failed.');
    } finally {
      setEstimatingPrice(false);
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
      price: formData.price !== '' ? Number(formData.price) : 0,
      fsd_details: formData.fsd_details.trim(),
      notes: formData.notes.trim(),
      languages: formData.languages || [],
      valuation: formData.valuation || null,
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
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8">
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
              Register project details, FSD specifications, GitHub language breakdown, and AI-estimated pricing.
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* GitHub Repository URL + One-Click Auto-Generate Banner */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
              <div className="flex-1">
                <label
                  htmlFor="repository-url"
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  <GitBranch className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Public GitHub Repository URL</span>
                  <span className="text-[11px] font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  id="repository-url"
                  name="repository_url"
                  type="text"
                  value={formData.repository_url}
                  onChange={handleChange}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={handleAnalyzeGitHub}
                disabled={analyzingRepo}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0 h-[38px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${analyzingRepo ? 'animate-spin' : ''}`} />
                <span>
                  {analyzingRepo ? 'Analyzing Repo...' : 'Auto-Fill from GitHub'}
                </span>
              </button>
            </div>

            {errors.repository_url && (
              <p className="text-xs text-rose-600 dark:text-rose-400">
                {errors.repository_url}
              </p>
            )}

            {repoMessage.text && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  repoMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                }`}
              >
                {repoMessage.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{repoMessage.text}</span>
              </div>
            )}

            {/* GitHub Languages Percentage Bar */}
            {Array.isArray(formData.languages) && formData.languages.length > 0 && (
              <div className="pt-1 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <FileCode2 className="w-3.5 h-3.5 text-indigo-500" />
                    Detected Repository Languages
                  </span>
                  <span>100%</span>
                </div>
                <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-200 dark:bg-slate-800">
                  {formData.languages.map((lang) => (
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
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {formData.languages.map((lang) => (
                    <div key={lang.name} className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: getLanguageColor(lang.name) }}
                      />
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {lang.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {lang.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Website Name, Status & Live URL */}
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
              Short Description <span className="text-rose-500">*</span>
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
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {errors.description}
              </p>
            )}
          </div>

          {/* Live Website URL & Technology Stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="website-url"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Live Website URL</span>
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
                htmlFor="tech-stack"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>Technology Stack</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                id="tech-stack"
                name="tech_stack"
                type="text"
                value={formData.tech_stack}
                onChange={handleChange}
                placeholder="React, Vite, Tailwind CSS, Google Sheets"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.tech_stack && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {errors.tech_stack}
                </p>
              )}
            </div>
          </div>

          {previewTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 -mt-2">
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

          {/* Website Details / Functional Specification Document (FSD) Textbox */}
          <div>
            <label
              htmlFor="fsd-details"
              className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Website Details / Functional Specification Document (FSD)</span>
                <span className="text-rose-500">*</span>
              </span>
              <span className="text-[11px] font-normal text-indigo-600 dark:text-indigo-400">
                Required — Primary basis for Groq AI Price Auto-Detector
              </span>
            </label>
            <textarea
              id="fsd-details"
              name="fsd_details"
              rows={5}
              value={formData.fsd_details}
              onChange={handleChange}
              placeholder="Paste the Functional Specification Document (FSD) or detailed specifications of the website here (e.g., project overview, features, user roles, database tables, pages). Groq AI bases the website creation price directly on this specification..."
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y font-mono text-xs leading-relaxed"
            />
            {errors.fsd_details && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {errors.fsd_details}
              </p>
            )}
          </div>

          {/* Website Price & AI Price Auto-Detector Section */}
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-200/70 dark:border-indigo-900/50 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <label
                  htmlFor="website-price"
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  <Banknote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Website Price ({currency})</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    (Manual or AI Auto-Detected)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                    {currencySymbol}
                  </span>
                  <input
                    id="website-price"
                    name="price"
                    type="number"
                    min="0"
                    step="any"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder={currency === 'USD' ? '850' : '45000'}
                    className="w-full pl-8 pr-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {errors.price && (
                  <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                    {errors.price}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleAiAutoDetectPrice}
                disabled={estimatingPrice}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0 h-[38px]"
              >
                <Sparkles className={`w-3.5 h-3.5 ${estimatingPrice ? 'animate-spin' : ''}`} />
                <span>
                  {estimatingPrice
                    ? 'Groq AI Analyzing...'
                    : 'Groq AI Auto-Detect Price'}
                </span>
              </button>
            </div>

            {/* AI Valuation Report Preview */}
            {formData.valuation && (
              <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/70 dark:text-indigo-200">
                      {formData.valuation.detectedCategory}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-medium bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {formData.valuation.complexityLevel} Complexity (~
                      {formData.valuation.estimatedHours} hrs)
                    </span>
                  </div>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    AI Valuation:{' '}
                    {formatCurrency(
                      currency === 'USD'
                        ? formData.valuation.recommendedPriceUSD
                        : formData.valuation.recommendedPricePHP,
                      currency
                    )}
                  </span>
                </div>

                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {formData.valuation.summary}
                </p>

                {Array.isArray(formData.valuation.breakdown) && (
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    {formData.valuation.breakdown.map((row, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {row.item}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {row.description} ({row.hours} hrs)
                          </p>
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(
                            currency === 'USD' ? row.amountUSD : row.amountPHP,
                            currency
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Personal Notes */}
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
              rows={2}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Hosting details, domain renewal dates, client notes, or environment reminders..."
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

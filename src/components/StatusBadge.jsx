import React from 'react';

const STATUS_STYLES = {
  Planning: {
    badge:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400 dark:bg-slate-400',
  },
  'In Development': {
    badge:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70',
    dot: 'bg-amber-500',
  },
  Testing: {
    badge:
      'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/70',
    dot: 'bg-sky-500',
  },
  'Deployed / Live': {
    badge:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70',
    dot: 'bg-emerald-500',
  },
  Maintenance: {
    badge:
      'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/70',
    dot: 'bg-orange-500',
  },
  Archived: {
    badge:
      'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-400 dark:border-zinc-700',
    dot: 'bg-zinc-400',
  },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Planning;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {status || 'Planning'}
    </span>
  );
}


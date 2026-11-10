/**
 * GitHub Repository Analyzer & Groq AI Website Price / Valuation Estimator
 * Supports:
 * 1. Public GitHub Repository language percentages, tech stack detection, and description generation
 * 2. Groq AI (`llama-3.3-70b-versatile`) Website Classifier & Valuation Engine
 * 3. Currency formatting in Philippine Peso (₱ PHP) and US Dollar ($ USD)
 */

const CURRENCY_STORAGE_KEY = 'mwt_currency';

// Language color map matching GitHub's official language colors
export const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Python: '#3572A5',
  PHP: '#4F5D95',
  Java: '#b07219',
  'C#': '#178600',
  'C++': '#f34b7d',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Astro: '#ff5a03',
  Dart: '#00B4AB',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Shell: '#89e051',
  Dockerfile: '#384d54',
  SQL: '#e38c00',
};

export function getLanguageColor(lang) {
  return LANGUAGE_COLORS[lang] || '#6366f1';
}

// ============================================================================
// CURRENCY HELPERS (PHP ₱ default, switchable to USD $ in Settings)
// ============================================================================

export const PHP_TO_USD_RATE = 56; // 1 USD ≈ 56 PHP reference conversion

export function getPreferredCurrency() {
  return localStorage.getItem(CURRENCY_STORAGE_KEY) || 'PHP';
}

export function setPreferredCurrency(currency) {
  const normalized = currency === 'USD' ? 'USD' : 'PHP';
  localStorage.setItem(CURRENCY_STORAGE_KEY, normalized);
  return normalized;
}

export function formatCurrency(amount, currency = getPreferredCurrency()) {
  const num = Number(amount);
  if (Number.isNaN(num) || num <= 0) return '—';

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(num);
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(num);
}

export function parseJsonSafe(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ============================================================================
// PUBLIC GITHUB REPOSITORY ANALYZER
// ============================================================================

export function parseGitHubOwnerRepo(repoUrl) {
  if (!repoUrl) return null;
  const trimmed = String(repoUrl).trim();
  const match = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:\/.*)?$/i
  );
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
  };
}

const KNOWN_PACKAGE_TECH = {
  react: 'React',
  'react-router-dom': 'React Router',
  next: 'Next.js',
  vue: 'Vue.js',
  nuxt: 'Nuxt',
  svelte: 'Svelte',
  '@sveltejs/kit': 'SvelteKit',
  astro: 'Astro',
  vite: 'Vite',
  tailwindcss: 'Tailwind CSS',
  '@tailwindcss/vite': 'Tailwind CSS',
  bootstrap: 'Bootstrap',
  '@mui/material': 'Material UI',
  'lucide-react': 'Lucide Icons',
  'framer-motion': 'Framer Motion',
  three: 'Three.js',
  '@supabase/supabase-js': 'Supabase',
  firebase: 'Firebase',
  prisma: 'Prisma',
  '@prisma/client': 'Prisma',
  mongoose: 'MongoDB',
  mongodb: 'MongoDB',
  pg: 'PostgreSQL',
  mysql2: 'MySQL',
  express: 'Express.js',
  fastify: 'Fastify',
  '@nestjs/core': 'NestJS',
  stripe: 'Stripe',
  '@stripe/stripe-js': 'Stripe',
  openai: 'OpenAI API',
  'groq-sdk': 'Groq AI',
  axios: 'Axios',
  '@tanstack/react-query': 'TanStack Query',
  redux: 'Redux',
  zustand: 'Zustand',
  'chart.js': 'Chart.js',
  recharts: 'Recharts',
  typescript: 'TypeScript',
};

/**
 * Fetches public GitHub repository metadata, language byte breakdown & percentages,
 * package.json dependencies, and README excerpt.
 */
export async function analyzeGitHubRepository(repoUrl) {
  const parsed = parseGitHubOwnerRepo(repoUrl);
  if (!parsed) {
    return {
      ok: false,
      error:
        'Please enter a valid public GitHub repository URL (e.g., https://github.com/username/repo).',
    };
  }

  const { owner, repo } = parsed;
  const baseApi = `https://api.github.com/repos/${encodeURIComponent(
    owner
  )}/${encodeURIComponent(repo)}`;

  try {
    const [repoRes, langRes] = await Promise.all([
      fetch(baseApi, { headers: { Accept: 'application/vnd.github.v3+json' } }),
      fetch(`${baseApi}/languages`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      }),
    ]);

    if (repoRes.status === 404) {
      return {
        ok: false,
        error: `GitHub repository "${owner}/${repo}" was not found or is private.`,
      };
    }

    if (!repoRes.ok) {
      return {
        ok: false,
        error: `GitHub API returned HTTP ${repoRes.status}. Please try again shortly.`,
      };
    }

    const repoData = await repoRes.json();
    const langData = langRes.ok ? await langRes.json() : {};

    // Compute language percentages
    const totalBytes = Object.values(langData).reduce(
      (sum, b) => sum + Number(b || 0),
      0
    );
    const languages = Object.entries(langData)
      .map(([name, bytes]) => {
        const rawPct = totalBytes > 0 ? (Number(bytes) / totalBytes) * 100 : 0;
        return {
          name,
          bytes: Number(bytes),
          percentage: Number(rawPct.toFixed(1)),
        };
      })
      .sort((a, b) => b.bytes - a.bytes);

    if (languages.length > 0 && languages.every((l) => l.percentage === 0)) {
      languages[0].percentage = 100;
    }

    // Attempt to inspect package.json and README in parallel
    const [pkgRes, readmeRes] = await Promise.all([
      fetch(`${baseApi}/contents/package.json`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      }).catch(() => null),
      fetch(`${baseApi}/readme`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      }).catch(() => null),
    ]);

    const detectedTech = new Set();
    languages.forEach((l) => detectedTech.add(l.name));

    if (Array.isArray(repoData.topics)) {
      repoData.topics.forEach((t) => {
        if (t && t.length <= 24) detectedTech.add(t);
      });
    }

    let dependencyCount = 0;
    if (pkgRes && pkgRes.ok) {
      try {
        const pkgFile = await pkgRes.json();
        if (pkgFile?.content) {
          const decoded = atob(pkgFile.content.replace(/\n/g, ''));
          const pkgJson = JSON.parse(decoded);
          const allDeps = {
            ...(pkgJson.dependencies || {}),
            ...(pkgJson.devDependencies || {}),
          };
          const depNames = Object.keys(allDeps);
          dependencyCount = depNames.length;
          depNames.forEach((dep) => {
            if (KNOWN_PACKAGE_TECH[dep]) {
              detectedTech.add(KNOWN_PACKAGE_TECH[dep]);
            }
          });
        }
      } catch {
        // Ignore malformed package.json
      }
    }

    let readmeText = '';
    if (readmeRes && readmeRes.ok) {
      try {
        const readmeFile = await readmeRes.json();
        if (readmeFile?.content) {
          const binary = atob(readmeFile.content.replace(/\n/g, ''));
          const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
          readmeText = new TextDecoder('utf-8').decode(bytes);
        }
      } catch {
        // Ignore README decode errors
      }
    }

    // Extract a clean description from repoData.description or first paragraph of README
    let generatedDescription = (repoData.description || '').trim();
    if (!generatedDescription && readmeText) {
      const cleanLines = readmeText
        .split('\n')
        .map((line) => line.replace(/^[#*>\-\s]+/, '').trim())
        .filter(
          (line) =>
            line.length > 25 &&
            !line.startsWith('![') &&
            !line.startsWith('[!') &&
            !line.startsWith('```') &&
            !line.toLowerCase().startsWith('table of contents')
        );
      if (cleanLines.length > 0) {
        generatedDescription = cleanLines[0].slice(0, 260);
      }
    }

    if (!generatedDescription) {
      const topLangs = languages
        .slice(0, 3)
        .map((l) => l.name)
        .join(', ');
      generatedDescription = `${
        repoData.name || repo
      } web application built with ${topLangs || 'modern web technologies'}.`;
    }

    const formattedRepoName = (repoData.name || repo)
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return {
      ok: true,
      owner,
      repo,
      suggestedName: formattedRepoName,
      suggestedDescription: generatedDescription,
      suggestedHomepage: repoData.homepage || '',
      suggestedTechStack: Array.from(detectedTech).join(', '),
      readmeExcerpt: readmeText ? readmeText.slice(0, 3000).trim() : '',
      languages,
      metrics: {
        sizeKb: Number(repoData.size || 0),
        totalLanguageBytes: totalBytes,
        stars: Number(repoData.stargazers_count || 0),
        dependencyCount,
        updatedAt: repoData.pushed_at || repoData.updated_at || null,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Unable to fetch GitHub repository data.',
    };
  }
}

// ============================================================================
// GROQ AI WEBSITE CLASSIFIER, PRICE AUTO-DETECTOR & VALUATION REPORT GENERATOR
// ============================================================================

export function getGroqApiKey() {
  return (
    import.meta.env.GROQ_API_KEY?.trim() ||
    import.meta.env.VITE_GROQ_API_KEY?.trim() ||
    ''
  );
}

/**
 * Calls Groq AI (`llama-3.3-70b-versatile`) to classify the website project,
 * determine its realistic market price in PHP & USD, and generate an itemized
 * valuation breakdown tailored to the exact project scope.
 */
export async function generateAiWebsiteValuation({
  name = '',
  description = '',
  fsdDetails = '',
  techStack = '',
  languages = [],
  repoMetrics = null,
}) {
  const groqKey = getGroqApiKey();
  if (!groqKey) {
    throw new Error(
      'GROQ_API_KEY is not configured in environment variables (.env or Vercel Environment Variables).'
    );
  }

  const totalCodeBytes = (languages || []).reduce(
    (sum, l) => sum + Number(l.bytes || 0),
    0
  );
  const totalCodeKb = Math.round((totalCodeBytes / 1024) * 10) / 10;

  const systemPrompt = `You are an expert software estimator and freelance/agency web development pricing specialist in the Philippines and international markets.
Your job is to evaluate a website project based on its actual name, description, technology stack, GitHub repository language breakdown, codebase size (in KB of source code), and Functional Specification Document (FSD) / details.

CRITICAL PRICING RULES — DO NOT give every project the same price! Differentiate sharply based on actual scope and codebase size:
- Tier 1 (Simple Static Site / Basic HTML-CSS-JS / Mini Calculator / Single Landing Page / Small School Exercise, < 25 KB source code):
  ₱3,000 to ₱9,500 PHP ($55 to $170 USD) | 6 to 16 hours | Complexity: "Low"
- Tier 2 (Multi-page Portfolio / Brochure Website / Business Landing Site / Simple Blog / Basic React SPA without complex backend):
  ₱10,000 to ₱22,000 PHP ($180 to $395 USD) | 18 to 35 hours | Complexity: "Low" or "Medium"
- Tier 3 (Custom CRUD Web App / Management Dashboard / Tracker / Booking System / Authentication + Database):
  ₱25,000 to ₱48,000 PHP ($445 to $855 USD) | 38 to 70 hours | Complexity: "Medium" or "High"
- Tier 4 (Full-Stack E-Commerce / Multi-Role System / Payment Gateway / AI-Integrated Platform / Complex SaaS):
  ₱50,000 to ₱110,000 PHP ($890 to $1,960 USD) | 75 to 150 hours | Complexity: "High" or "Enterprise"

Ensure:
1. Each breakdown item's amountPHP sums up to recommendedPricePHP (and amountUSD sums up to recommendedPriceUSD, using 1 USD ≈ 56 PHP).
2. Each breakdown item is specific to THIS website's actual features and technologies (3 to 5 line items).
3. Return ONLY valid JSON matching the exact schema requested.`;

  const userPrompt = `Evaluate this website project and provide a realistic, project-specific valuation:

Website Name: ${name || 'Untitled Project'}
Short Description: ${description || 'None provided'}
Technology Stack: ${techStack || 'None specified'}
GitHub Languages Breakdown: ${
    languages && languages.length > 0
      ? languages.map((l) => `${l.name}: ${l.percentage}% (${l.bytes} bytes)`).join(', ')
      : 'Not analyzed'
  }
Total Source Code Volume: ${totalCodeKb > 0 ? `${totalCodeKb} KB` : 'Unknown'}
Repository Metrics: ${repoMetrics ? JSON.stringify(repoMetrics) : 'Not available'}
FSD / Detailed Specifications:
${(fsdDetails || 'None provided').slice(0, 5000)}

Respond ONLY with a JSON object in this exact structure:
{
  "detectedCategory": "Specific category of this website (e.g., Static Landing Page, Interactive Portfolio, Management Dashboard, E-Commerce Store, AI Web App)",
  "complexityLevel": "Low | Medium | High | Enterprise",
  "estimatedHours": 24,
  "recommendedPricePHP": 15000,
  "recommendedPriceUSD": 270,
  "summary": "2-3 sentences specifically explaining what this website does, its codebase/feature scope, and why it is priced at this exact tier.",
  "breakdown": [
    {
      "item": "Specific Module or Phase Name",
      "description": "What was built for this specific module",
      "hours": 8,
      "amountPHP": 5000,
      "amountUSD": 90
    }
  ]
}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.35,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    let errText = `Groq API error (HTTP ${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.error?.message) {
        errText = `Groq AI Error: ${errJson.error.message}`;
      }
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(errText);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq AI returned an empty response.');
  }

  const parsed = JSON.parse(content);
  const breakdown = Array.isArray(parsed.breakdown)
    ? parsed.breakdown.map((row) => ({
        item: String(row.item || 'Module'),
        description: String(row.description || ''),
        hours: Number(row.hours) || 4,
        amountPHP: Number(row.amountPHP) || 0,
        amountUSD:
          Number(row.amountUSD) ||
          Math.round((Number(row.amountPHP) || 0) / PHP_TO_USD_RATE),
      }))
    : [];

  const sumPHP = breakdown.reduce((s, r) => s + r.amountPHP, 0);
  const sumUSD = breakdown.reduce((s, r) => s + r.amountUSD, 0);
  const sumHours = breakdown.reduce((s, r) => s + r.hours, 0);

  const recommendedPricePHP = Number(parsed.recommendedPricePHP) || sumPHP || 10000;
  const recommendedPriceUSD =
    Number(parsed.recommendedPriceUSD) ||
    sumUSD ||
    Math.round(recommendedPricePHP / PHP_TO_USD_RATE);

  return {
    detectedCategory: String(parsed.detectedCategory || 'Custom Website'),
    complexityLevel: String(parsed.complexityLevel || 'Medium'),
    estimatedHours: Number(parsed.estimatedHours) || sumHours || 20,
    recommendedPricePHP,
    recommendedPriceUSD,
    summary: String(parsed.summary || ''),
    breakdown,
    aiModel: 'Groq (Llama 3.3 70B)',
    generatedAt: new Date().toISOString(),
  };
}

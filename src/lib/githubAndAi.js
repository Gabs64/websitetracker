/**
 * GitHub Repository Analyzer & Smart AI Website Price / Valuation Estimator
 * Supports:
 * 1. Public GitHub Repository language percentages, tech stack detection, and description generation
 * 2. Built-in Smart AI Website Classifier & Valuation Engine (plus optional Gemini API enhancement)
 * 3. Currency formatting in Philippine Peso (₱ PHP) and US Dollar ($ USD)
 */

const CURRENCY_STORAGE_KEY = 'mwt_currency';
const GEMINI_KEY_STORAGE_KEY = 'mwt_gemini_api_key';

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
  '@google/generative-ai': 'Gemini AI',
  axios: 'Axios',
  '@tanstack/react-query': 'TanStack Query',
  redux: 'Redux',
  zustand: 'Zustand',
  chart: 'Chart.js',
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
      error: 'Please enter a valid public GitHub repository URL (e.g., https://github.com/username/repo).',
    };
  }

  const { owner, repo } = parsed;
  const baseApi = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  try {
    const [repoRes, langRes] = await Promise.all([
      fetch(baseApi, { headers: { Accept: 'application/vnd.github.v3+json' } }),
      fetch(`${baseApi}/languages`, { headers: { Accept: 'application/vnd.github.v3+json' } }),
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
    const totalBytes = Object.values(langData).reduce((sum, b) => sum + Number(b || 0), 0);
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

    // Ensure rounding sums cleanly if non-empty
    if (languages.length > 0 && languages.every((l) => l.percentage === 0)) {
      languages[0].percentage = 100;
    }

    // Attempt to inspect package.json and README in parallel (optional)
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
// SMART AI WEBSITE CLASSIFIER, PRICE AUTO-DETECTOR & VALUATION REPORT GENERATOR
// ============================================================================

export function getGeminiApiKey() {
  return (
    import.meta.env.GEMINI_API_KEY?.trim() ||
    import.meta.env.VITE_GEMINI_API_KEY?.trim() ||
    localStorage.getItem(GEMINI_KEY_STORAGE_KEY)?.trim() ||
    ''
  );
}

export function setCustomGeminiApiKey(key) {
  const trimmed = String(key || '').trim();
  if (!trimmed) {
    localStorage.removeItem(GEMINI_KEY_STORAGE_KEY);
  } else {
    localStorage.setItem(GEMINI_KEY_STORAGE_KEY, trimmed);
  }
}

/**
 * Analyzes project name, description, FSD / project details, tech stack, and GitHub language
 * metrics to classify the website, estimate its market price, and generate a line-item
 * valuation report.
 */
export async function generateAiWebsiteValuation({
  name = '',
  description = '',
  fsdDetails = '',
  techStack = '',
  languages = [],
  repoMetrics = null,
  currency = getPreferredCurrency(),
}) {
  // First compute the deterministic Smart Valuation Report
  const baseReport = computeSmartHeuristicValuation({
    name,
    description,
    fsdDetails,
    techStack,
    languages,
    repoMetrics,
    currency,
  });

  // If a Gemini API key is configured, optionally enrich the executive summary & price refinement
  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    try {
      const enriched = await refineWithGeminiApi(geminiKey, {
        name,
        description,
        fsdDetails,
        techStack,
        languages,
        baseReport,
      });
      if (enriched) {
        return enriched;
      }
    } catch {
      // Fall back gracefully to the built-in Smart AI Estimator
    }
  }

  return baseReport;
}

function computeSmartHeuristicValuation({
  name,
  description,
  fsdDetails,
  techStack,
  languages,
}) {
  const combinedText = `${name} ${description} ${fsdDetails} ${techStack}`.toLowerCase();
  const fsdLength = (fsdDetails || '').trim().length;

  // Count Functional Requirements if FSD contains FR-001, FR-002, etc.
  const frMatches = (fsdDetails || '').match(/\bfr[-_\s]?\d+\b/gi) || [];
  const uniqueFrCount = new Set(frMatches.map((m) => m.toUpperCase())).size;

  // Detect project category
  let detectedCategory = 'Custom Web Application';
  let baseHours = 24;

  if (
    /e-commerce|ecommerce|shop|storefront|cart|checkout|stripe|payment|product catalog/i.test(
      combinedText
    )
  ) {
    detectedCategory = 'E-Commerce / Online Storefront';
    baseHours = 48;
  } else if (
    /saas|subscription|multi-tenant|billing|workspace|organization/i.test(combinedText)
  ) {
    detectedCategory = 'SaaS Web Platform';
    baseHours = 60;
  } else if (
    /ai|llm|openai|gemini|gpt|machine learning|chatbot|agent|autodetect/i.test(combinedText)
  ) {
    detectedCategory = 'AI-Powered Web Application';
    baseHours = 45;
  } else if (
    /dashboard|tracker|admin|crm|erp|inventory|management|monitoring|analytics|portal/i.test(
      combinedText
    )
  ) {
    detectedCategory = 'Management Dashboard / Web Portal';
    baseHours = 36;
  } else if (
    /portfolio|landing page|brochure|personal site|resume|blog|agency site/i.test(combinedText)
  ) {
    detectedCategory = 'Portfolio / Marketing Website';
    baseHours = 16;
  }

  const breakdown = [];
  const hourlyRatePHP = 750; // Realistic skilled developer rate in PHP (~$13.40/hr equivalent)

  // 1. Base Architecture, UI/UX & Responsive Layout
  const uiHours = Math.round(baseHours * 0.45);
  breakdown.push({
    item: 'UI/UX Design & Responsive Frontend Architecture',
    description: `Core interface, responsive layout, navigation, and component system for ${detectedCategory}`,
    hours: uiHours,
    amountPHP: uiHours * hourlyRatePHP,
    amountUSD: Math.round((uiHours * hourlyRatePHP) / PHP_TO_USD_RATE),
  });

  // 2. Core Feature Implementation
  const coreHours = Math.round(baseHours * 0.55);
  breakdown.push({
    item: 'Core Application Logic & Interactive Views',
    description: 'Pages, forms, state management, search/filtering, and user workflows',
    hours: coreHours,
    amountPHP: coreHours * hourlyRatePHP,
    amountUSD: Math.round((coreHours * hourlyRatePHP) / PHP_TO_USD_RATE),
  });

  // 3. Authentication & Security / Access Control
  if (
    /auth|login|password|session|rls|row level security|single-owner|role|permission|jwt|oauth/i.test(
      combinedText
    )
  ) {
    const authHours = 10;
    breakdown.push({
      item: 'Authentication & Access Control Security',
      description: 'Protected routes, login/session verification, and security policies',
      hours: authHours,
      amountPHP: authHours * hourlyRatePHP,
      amountUSD: Math.round((authHours * hourlyRatePHP) / PHP_TO_USD_RATE),
    });
  }

  // 4. Database / Cloud Backend Integration
  if (
    /supabase|postgresql|postgres|mysql|mongodb|firebase|google sheets|prisma|database|crud|api/i.test(
      combinedText
    )
  ) {
    const dbHours = 14;
    breakdown.push({
      item: 'Database Schema & Backend API Integration',
      description: 'Persistent cloud data storage, CRUD endpoints, and data validation',
      hours: dbHours,
      amountPHP: dbHours * hourlyRatePHP,
      amountUSD: Math.round((dbHours * hourlyRatePHP) / PHP_TO_USD_RATE),
    });
  }

  // 5. Special Integrations (AI, Payments, Charts, External APIs)
  let integrationHours = 0;
  const integrationNotes = [];
  if (/ai|openai|gemini|llm|autodetect|smart/i.test(combinedText)) {
    integrationHours += 12;
    integrationNotes.push('AI/Smart estimation');
  }
  if (/stripe|paypal|paymongo|gcash|checkout|payment/i.test(combinedText)) {
    integrationHours += 14;
    integrationNotes.push('Payment gateway');
  }
  if (/chart|analytics|recharts|report|metric|statistics|summary card/i.test(combinedText)) {
    integrationHours += 8;
    integrationNotes.push('Analytics & reporting');
  }
  if (/github|webhook|rest api|graphql/i.test(combinedText)) {
    integrationHours += 6;
    integrationNotes.push('External API integration');
  }

  if (integrationHours > 0) {
    breakdown.push({
      item: 'Advanced Features & Third-Party Integrations',
      description: integrationNotes.join(', '),
      hours: integrationHours,
      amountPHP: integrationHours * hourlyRatePHP,
      amountUSD: Math.round((integrationHours * hourlyRatePHP) / PHP_TO_USD_RATE),
    });
  }

  // 6. FSD Scope & Multi-Language Codebase Scale Adjustment
  let scopeHours = 0;
  if (uniqueFrCount >= 5) {
    scopeHours += Math.min(uniqueFrCount * 2, 24);
  } else if (fsdLength > 800) {
    scopeHours += 10;
  } else if (fsdLength > 300) {
    scopeHours += 5;
  }

  const totalLangBytes = (languages || []).reduce((acc, l) => acc + (l.bytes || 0), 0);
  if (totalLangBytes > 100000) {
    scopeHours += 12;
  } else if (totalLangBytes > 35000) {
    scopeHours += 6;
  }

  if (scopeHours > 0) {
    breakdown.push({
      item: 'Specification Scope, QA Testing & Deployment',
      description:
        uniqueFrCount > 0
          ? `Covers ${uniqueFrCount} documented functional requirements, responsive QA, and production deployment`
          : 'Comprehensive specification requirements, cross-device QA, and production deployment',
      hours: scopeHours,
      amountPHP: scopeHours * hourlyRatePHP,
      amountUSD: Math.round((scopeHours * hourlyRatePHP) / PHP_TO_USD_RATE),
    });
  }

  const totalHours = breakdown.reduce((sum, item) => sum + item.hours, 0);
  const rawPHP = breakdown.reduce((sum, item) => sum + item.amountPHP, 0);
  // Round to nearest 500 PHP for clean pricing
  const recommendedPricePHP = Math.round(rawPHP / 500) * 500;
  const recommendedPriceUSD = Math.round((recommendedPricePHP / PHP_TO_USD_RATE) / 10) * 10;

  let complexityLevel = 'Medium';
  if (totalHours >= 80) complexityLevel = 'Enterprise';
  else if (totalHours >= 50) complexityLevel = 'High';
  else if (totalHours <= 24) complexityLevel = 'Low';

  const topLangSummary =
    languages && languages.length > 0
      ? ` Primary codebase languages: ${languages
          .slice(0, 3)
          .map((l) => `${l.name} (${l.percentage}%)`)
          .join(', ')}.`
      : '';

  const summary = `Classified as a ${complexityLevel}-complexity ${detectedCategory} requiring approximately ${totalHours} engineering hours.${topLangSummary} Estimated valuation includes UI/UX architecture, core functional modules, data persistence, and deployment.`;

  return {
    detectedCategory,
    complexityLevel,
    estimatedHours: totalHours,
    recommendedPricePHP,
    recommendedPriceUSD,
    summary,
    breakdown,
    generatedAt: new Date().toISOString(),
  };
}

async function refineWithGeminiApi(apiKey, { name, description, fsdDetails, techStack, languages, baseReport }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const prompt = `You are a web development valuation expert. Analyze this website project and return ONLY valid JSON matching the schema below.
Website Name: ${name}
Description: ${description}
Tech Stack: ${techStack}
GitHub Languages: ${JSON.stringify(languages)}
FSD / Project Details:
${(fsdDetails || '').slice(0, 4000)}

Baseline Heuristic Estimate:
Category: ${baseReport.detectedCategory}
Estimated Hours: ${baseReport.estimatedHours}
Recommended PHP: ${baseReport.recommendedPricePHP}
Recommended USD: ${baseReport.recommendedPriceUSD}

Return JSON with:
{
  "detectedCategory": "string",
  "complexityLevel": "Low | Medium | High | Enterprise",
  "summary": "2-3 concise sentences explaining what the website is about and why it is valued at this price"
}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  const parsed = JSON.parse(text);
  return {
    ...baseReport,
    detectedCategory: parsed.detectedCategory || baseReport.detectedCategory,
    complexityLevel: parsed.complexityLevel || baseReport.complexityLevel,
    summary: parsed.summary || baseReport.summary,
  };
}


/**
 * GitHub Repository Analyzer & Groq AI Website Price / Valuation Estimator
 * Supports:
 * 1. Public GitHub Repository language percentages, tech stack detection, and description generation
 * 2. Groq AI Dynamic Model Discovery & Website Valuation Engine
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

const PREFERRED_GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'qwen/qwen3-32b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
];

/**
 * Queries Groq's `/openai/v1/models` endpoint to find the active chat models
 * that the user's API key has permission to use.
 */
async function getAvailableGroqModels(groqKey) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: `Bearer ${groqKey}`,
      },
    });
    if (!res.ok) return PREFERRED_GROQ_MODELS;

    const json = await res.json();
    const allIds = (json?.data || [])
      .map((m) => m.id)
      .filter(
        (id) =>
          id &&
          !/whisper|guard|tts|playai|embed|orpheus|allam|moderation/i.test(id)
      );

    if (allIds.length === 0) return PREFERRED_GROQ_MODELS;

    // Rank preferred models that exist in allIds first, then append any remaining chat models
    const ranked = [
      ...PREFERRED_GROQ_MODELS.filter((m) => allIds.includes(m)),
      ...allIds.filter((id) => !PREFERRED_GROQ_MODELS.includes(id)),
    ];
    return ranked;
  } catch {
    return PREFERRED_GROQ_MODELS;
  }
}

function extractJsonObject(rawContent) {
  if (!rawContent) return null;
  const trimmed = String(rawContent).trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Strip <think>...</think> blocks if present (e.g., reasoning models like Qwen / DeepSeek)
    const withoutThink = trimmed.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    const match = withoutThink.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not parse JSON from AI response.');
  }
}

/**
 * Proportionally scales an existing valuation report's breakdown items so their
 * sum matches a manually specified price in the given currency (with clean rounding
 * and proportional hours per module).
 */
export function scaleValuationToManualPrice(valuation, manualPrice, currency = getPreferredCurrency()) {
  const numPrice = Number(manualPrice);
  if (!valuation || Number.isNaN(numPrice) || numPrice <= 0) return valuation;

  const targetPHP =
    currency === 'USD' ? Math.round(numPrice * PHP_TO_USD_RATE) : Math.round(numPrice);
  const targetUSD =
    currency === 'USD' ? Math.round(numPrice) : Math.round(numPrice / PHP_TO_USD_RATE);

  const items = Array.isArray(valuation.breakdown) ? valuation.breakdown : [];
  if (items.length === 0) {
    return {
      ...valuation,
      recommendedPricePHP: targetPHP,
      recommendedPriceUSD: targetUSD,
    };
  }

  const currentTotalPHP =
    items.reduce((sum, item) => sum + (Number(item.amountPHP) || 0), 0) ||
    Number(valuation.recommendedPricePHP) ||
    1;
  const totalEstimatedHours =
    Number(valuation.estimatedHours) ||
    items.reduce((sum, item) => sum + (Number(item.hours) || 0), 0) ||
    24;

  let runningPHP = 0;
  let runningUSD = 0;
  let runningHours = 0;

  const scaledBreakdown = items.map((item, idx) => {
    const isLast = idx === items.length - 1;
    const weight = (Number(item.amountPHP) || 1) / currentTotalPHP;

    // Round intermediate PHP amounts to nearest 50 PHP for clean display
    const rawItemPHP = targetPHP * weight;
    const itemPHP = isLast
      ? Math.max(0, targetPHP - runningPHP)
      : targetPHP >= 1000
      ? Math.round(rawItemPHP / 50) * 50
      : Math.round(rawItemPHP);

    const itemUSD = isLast
      ? Math.max(0, targetUSD - runningUSD)
      : Math.round(targetUSD * weight);

    const itemHours = isLast
      ? Math.max(1, totalEstimatedHours - runningHours)
      : Math.max(1, Math.round(totalEstimatedHours * weight));

    runningPHP += itemPHP;
    runningUSD += itemUSD;
    runningHours += itemHours;

    return {
      ...item,
      hours: itemHours,
      amountPHP: itemPHP,
      amountUSD: itemUSD,
    };
  });

  const finalHours = scaledBreakdown.reduce((sum, r) => sum + r.hours, 0);

  return {
    ...valuation,
    estimatedHours: finalHours,
    recommendedPricePHP: targetPHP,
    recommendedPriceUSD: targetUSD,
    breakdown: scaledBreakdown,
  };
}

/**
 * Calls Groq AI to classify the website project, determine its realistic market
 * price in PHP & USD (or allocate a manually entered targetPrice across FSD modules),
 * and generate an itemized valuation breakdown tailored to the exact project scope.
 */
export async function generateAiWebsiteValuation({
  name = '',
  description = '',
  fsdDetails = '',
  techStack = '',
  languages = [],
  repoMetrics = null,
  targetPrice = 0,
  currency = getPreferredCurrency(),
}) {
  const groqKey = getGroqApiKey();
  if (!groqKey) {
    throw new Error(
      'GROQ_API_KEY is not configured in environment variables (.env or Vercel Environment Variables).'
    );
  }

  const cleanFsd = String(fsdDetails || '').trim();
  if (!cleanFsd) {
    throw new Error(
      'Website Details / Functional Specification Document (FSD) must be filled in first. The AI bases the price and breakdown strictly on the FSD.'
    );
  }

  const manualAmount = Number(targetPrice);
  const hasManualPrice = !Number.isNaN(manualAmount) && manualAmount > 0;
  const manualPHP = hasManualPrice
    ? currency === 'USD'
      ? Math.round(manualAmount * PHP_TO_USD_RATE)
      : Math.round(manualAmount)
    : 0;
  const manualUSD = hasManualPrice
    ? currency === 'USD'
      ? Math.round(manualAmount)
      : Math.round(manualAmount / PHP_TO_USD_RATE)
    : 0;

  const totalCodeBytes = (languages || []).reduce(
    (sum, l) => sum + Number(l.bytes || 0),
    0
  );
  const totalCodeKb = Math.round((totalCodeBytes / 1024) * 10) / 10;

  const manualPriceInstruction = hasManualPrice
    ? `IMPORTANT MANUAL PRICE OVERRIDE:
The project owner has manually set the total website price to ₱${manualPHP} PHP ($${manualUSD} USD).
You MUST set "recommendedPricePHP": ${manualPHP} and "recommendedPriceUSD": ${manualUSD}, and you MUST distribute this exact total price across the 3 to 6 FSD-based breakdown items according to the relative effort of each module in the FSD so that the breakdown items sum up to ₱${manualPHP} PHP ($${manualUSD} USD).`
    : `Price strictly according to the scope and complexity of the FSD:
   - Small FSD (1-3 simple pages, static content, basic contact/info, no database or auth):
     ₱3,500 to ₱9,500 PHP ($65 to $170 USD) | 6 to 16 hours | Complexity: "Low"
   - Moderate FSD (Multi-page site, portfolio, blog, or basic interactive tool with 3-5 simple features):
     ₱10,000 to ₱22,000 PHP ($180 to $395 USD) | 18 to 35 hours | Complexity: "Low" or "Medium"
   - Standard Web App FSD (Single-role dashboard, CRUD management, authentication, search/filter, 1-2 database tables):
     ₱24,000 to ₱45,000 PHP ($430 to $800 USD) | 36 to 65 hours | Complexity: "Medium" or "High"
   - Comprehensive / Advanced FSD (Multi-role access, complex workflows, e-commerce/payments, AI integrations, 4+ database tables, extensive functional requirements):
     ₱48,000 to ₱110,000+ PHP ($860 to $1,960+ USD) | 70 to 150+ hours | Complexity: "High" or "Enterprise"`;

  const systemPrompt = `You are an expert software estimator and web development pricing specialist.
Your job is to evaluate a website's Functional Specification Document (FSD) / Website Details and generate a module-by-module valuation breakdown based strictly on the FSD.

HOW TO GENERATE THE FSD VALUATION & BREAKDOWN:
1. Carefully read every section, functional requirement (e.g., FR-001, FR-002...), feature, page, database table, authentication/security requirement, and integration listed in the FSD.
2. Break the valuation down directly by the actual functional modules / sections written in the FSD (3 to 6 breakdown items corresponding to the FSD's actual requirements).
3. ${manualPriceInstruction}

Ensure:
- The sum of amountPHP across all breakdown items equals recommendedPricePHP (and amountUSD equals recommendedPriceUSD, using 1 USD ≈ 56 PHP).
- Each breakdown item's "hours" MUST be proportional to its "amountPHP" (do NOT give every module the exact same hours if their prices differ!), and the sum of "hours" across all breakdown items MUST equal "estimatedHours".
- Use clean rounded numbers for amountPHP (e.g., multiples of 500 or 100 PHP).
- Every breakdown item directly references the specific requirements from the FSD.
- Also extract "suggestedProjectName", a concise 1-2 sentence "suggestedDescription" of the website from the FSD, and an array of "detectedTechStack" technologies mentioned in the FSD.
- Return ONLY valid JSON matching the exact schema requested (no markdown fences).`;

  const userPrompt = `Analyze the following Functional Specification Document (FSD) / Website Details and calculate a precise, FSD-driven website creation price and breakdown:

Website Name: ${name || 'Untitled Project'}
Short Description: ${description || 'None provided'}
Technology Stack: ${techStack || 'None specified'}
GitHub Languages (supporting context): ${
    languages && languages.length > 0
      ? languages.map((l) => `${l.name}: ${l.percentage}%`).join(', ')
      : 'Not analyzed'
  } (${totalCodeKb > 0 ? `${totalCodeKb} KB` : 'N/A'})

=== FUNCTIONAL SPECIFICATION DOCUMENT (FSD) / WEBSITE DETAILS (PRIMARY PRICING BASIS) ===
${cleanFsd.slice(0, 12000)}
=========================================================================================

Respond ONLY with a valid JSON object in this exact structure:
{
  "suggestedProjectName": "Official Project Name from the FSD",
  "suggestedDescription": "Concise 1-2 sentence description of what this website does based on the FSD",
  "detectedTechStack": ["React", "Tailwind CSS"],
  "detectedCategory": "Specific website type based on the FSD",
  "complexityLevel": "Low | Medium | High | Enterprise",
  "estimatedHours": 40,
  "recommendedPricePHP": 25000,
  "recommendedPriceUSD": 445,
  "summary": "2-3 sentences explaining the exact scope found in the FSD (number of modules, auth/DB/features) and why it justifies this price.",
  "breakdown": [
    {
      "item": "FSD Module / Requirement Group Name",
      "description": "Specific functional requirements from the FSD covered in this item",
      "hours": 10,
      "amountPHP": 6000,
      "amountUSD": 107
    }
  ]
}`;

  const candidateModels = await getAvailableGroqModels(groqKey);
  let lastError = 'No accessible Groq AI chat models found for your API key.';

  for (const modelId of candidateModels.slice(0, 6)) {
    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.35,
          }),
        }
      );

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        lastError =
          errJson?.error?.message || `Groq API HTTP ${response.status} on ${modelId}`;
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      const parsed = extractJsonObject(content);
      if (!parsed) {
        lastError = `Empty JSON response from ${modelId}`;
        continue;
      }

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

      const recommendedPricePHP =
        Number(parsed.recommendedPricePHP) || sumPHP || 10000;
      const recommendedPriceUSD =
        Number(parsed.recommendedPriceUSD) ||
        sumUSD ||
        Math.round(recommendedPricePHP / PHP_TO_USD_RATE);

      const rawReport = {
        suggestedProjectName: String(parsed.suggestedProjectName || '').trim(),
        suggestedDescription: String(parsed.suggestedDescription || '').trim(),
        detectedTechStack: Array.isArray(parsed.detectedTechStack)
          ? parsed.detectedTechStack.map((t) => String(t).trim()).filter(Boolean)
          : [],
        detectedCategory: String(parsed.detectedCategory || 'Custom Website'),
        complexityLevel: String(parsed.complexityLevel || 'Medium'),
        estimatedHours: Number(parsed.estimatedHours) || sumHours || 20,
        recommendedPricePHP,
        recommendedPriceUSD,
        summary: String(parsed.summary || ''),
        breakdown,
        aiModel: `Groq (${modelId})`,
        generatedAt: new Date().toISOString(),
      };

      // If a manual targetPrice was specified, guarantee exact mathematical alignment across breakdown items
      if (hasManualPrice) {
        return scaleValuationToManualPrice(rawReport, manualAmount, currency);
      }

      return rawReport;
    } catch (err) {
      lastError = err?.message || lastError;
    }
  }

  throw new Error(`Groq AI Error: ${lastError}`);
}

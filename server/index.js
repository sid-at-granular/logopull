import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local or .env
dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config({ path: join(__dirname, '../.env') });
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { requireAuth } from '@clerk/express';

const app = express();
const PORT = process.env.PORT || 5174;

// Clerk configuration
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;

if (!CLERK_SECRET_KEY) {
  console.warn('Warning: CLERK_SECRET_KEY is not set. Authentication will not work properly.');
}

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn('Warning: CLERK_PUBLISHABLE_KEY is not set. Authentication may not work properly.');
}

// Set Clerk environment variables for @clerk/express
if (CLERK_SECRET_KEY) {
  process.env.CLERK_SECRET_KEY = CLERK_SECRET_KEY;
}
if (CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = CLERK_PUBLISHABLE_KEY;
}

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || '*' 
    : '*',
  credentials: true,
}));
app.use(express.json());

// Serve static files from the dist directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')));
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: 'An unexpected error occurred',
    details: isDev ? err.message : undefined,
  });
});

const LOGO_HINTS = ['logo', 'brand', 'icon', 'mark'];

function normalizeUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      return new URL(`https://${url}`).toString();
    }
    return new URL(url).toString();
  } catch (_err) {
    return null;
  }
}

function resolveUrl(candidate, base) {
  if (!candidate) return null;
  if (candidate.startsWith('data:')) return candidate;
  try {
    return new URL(candidate, base).toString();
  } catch (_err) {
    return null;
  }
}

function looksLikeLogo(attrs) {
  const haystack = [attrs.alt, attrs.class, attrs.id, attrs.src]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return LOGO_HINTS.some((hint) => haystack.includes(hint));
}

function toDataUrl(buffer, mimeType) {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

function pickExtensionFromMime(mimeType) {
  if (!mimeType) return 'bin';
  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
    'image/ico': 'ico',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
  };
  return map[mimeType.toLowerCase()] || mimeType.split('/').pop() || 'bin';
}

function fileNameFromUrl(inputUrl, mimeType, index) {
  try {
    const url = new URL(inputUrl);
    const path = url.pathname.split('/').filter(Boolean).pop();
    if (path) return path.split('?')[0];
  } catch (_err) {
    // fall through to generated name
  }
  return `logo-${index}.${pickExtensionFromMime(mimeType)}`;
}

async function fetchBinary(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept:
          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: url,
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const mimeType =
      response.headers['content-type'] || 'application/octet-stream';
    const buffer = Buffer.from(response.data);
    return { buffer, mimeType };
  } catch (err) {
    console.error(`Failed to fetch binary from ${url}:`, err.message);
    throw err;
  }
}

async function collectLogosFromHtml(html, baseUrl) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const results = [];

  function pushCandidate(url, sourceType, attrs = {}) {
    const resolved = resolveUrl(url, baseUrl);
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);
    results.push({ originalUrl: resolved, sourceType, attrs });
  }

  $('img').each((_idx, el) => {
    const attrs = {
      alt: $(el).attr('alt'),
      class: $(el).attr('class'),
      id: $(el).attr('id'),
      src: $(el).attr('src'),
    };
    if (looksLikeLogo(attrs)) {
      pushCandidate(attrs.src, 'img-tag', attrs);
    }
  });

  $('link[rel*="icon"]').each((_idx, el) => {
    pushCandidate($(el).attr('href'), 'link-icon');
  });

  const metaSelectors = [
    'meta[property="og:image"]',
    'meta[name="og:image"]',
    'meta[property="twitter:image"]',
    'meta[name="twitter:image"]',
  ];

  metaSelectors.forEach((selector) => {
    $(selector).each((_idx, el) => {
      pushCandidate($(el).attr('content'), selector);
    });
  });

  $('svg').each((_idx, el) => {
    const attrs = {
      class: $(el).attr('class'),
      id: $(el).attr('id'),
    };
    if (!looksLikeLogo({ ...attrs, src: '' })) return;
    const svgContent = $.html(el);
    const buffer = Buffer.from(svgContent);
    results.push({
      originalUrl: `data:image/svg+xml;base64,${buffer.toString('base64')}`,
      sourceType: 'inline-svg',
      attrs,
      inline: true,
    });
  });

  // As a fallback, include other <img> tags up to a limit
  $('img').each((_idx, el) => {
    const src = $(el).attr('src');
    if (!src) return;
    pushCandidate(src, 'img-tag-generic');
    if (results.length > 15) return false;
  });

  return results.slice(0, 25);
}

// Protect API routes with Clerk authentication
app.get('/api/logos', requireAuth(), async (req, res) => {
  const normalizedUrl = normalizeUrl(req.query.url);

  if (!normalizedUrl) {
    return res.status(400).json({ error: 'Please provide a valid URL.' });
  }

  try {
    const pageResponse = await axios.get(normalizedUrl, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const baseUrl =
      pageResponse.request?.res?.responseUrl ||
      pageResponse.config?.url ||
      normalizedUrl;
    
    if (!pageResponse.data || typeof pageResponse.data !== 'string') {
      throw new Error('Invalid HTML response from the server');
    }
    
    const logos = await collectLogosFromHtml(pageResponse.data, baseUrl);

    const enriched = await Promise.all(
      logos.map(async (logo, index) => {
        if (logo.inline || logo.originalUrl.startsWith('data:')) {
          const mimeType = 'image/svg+xml';
          return {
            id: index,
            originalUrl: logo.originalUrl,
            mimeType,
            dataUrl: logo.originalUrl,
            fileName: `inline-logo-${index}.svg`,
            byteSize: Buffer.from(
              logo.originalUrl.split(',').pop() || '',
              'base64'
            ).length,
            sourceType: logo.sourceType,
          };
        }

        try {
          const { buffer, mimeType } = await fetchBinary(logo.originalUrl);
          return {
            id: index,
            originalUrl: logo.originalUrl,
            mimeType,
            dataUrl: toDataUrl(buffer, mimeType),
            fileName: fileNameFromUrl(logo.originalUrl, mimeType, index),
            byteSize: buffer.length,
            sourceType: logo.sourceType,
          };
        } catch (assetErr) {
          console.error(
            `Failed to load asset ${logo.originalUrl}:`,
            assetErr.message
          );
          return null;
        }
      })
    );

    const filtered = enriched.filter(Boolean);

    if (!filtered.length) {
      return res.status(404).json({
        error: 'No logos found. You may need to try another URL.',
      });
    }

    res.json({
      requestedUrl: normalizedUrl,
      count: filtered.length,
      logos: filtered,
    });
  } catch (error) {
    console.error('Error fetching logos:', error);
    console.error('Error stack:', error.stack);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error:
        'Unable to fetch logos from that URL right now. Please verify the URL and try again.',
      details: isDev ? error.message : undefined,
      ...(isDev && error.response ? { statusCode: error.response.status } : {}),
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Serve the frontend for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Logo extraction server listening on http://localhost:${PORT}`);
});







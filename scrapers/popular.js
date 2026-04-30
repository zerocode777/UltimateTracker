'use strict';

const popularTPB = require('./popular-tpb');
const popular1337x = require('./popular-1337x');
const popularYTS = require('./popular-yts');
const popularEZTV = require('./popular-eztv');
const popularNyaa = require('./popular-nyaa');
const popularTGX = require('./popular-tgx');
const popularLime = require('./popular-lime');
const popularSolid = require('./popular-solid');
const popularABB = require('./popular-abb');

const TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const SOURCES = {
  all:               [popularTPB, popular1337x],
  movies:            [popular1337x],
  tv:                [popularEZTV, popular1337x],
  music:             [popular1337x],
  games:             [popular1337x],
  software:          [],
  anime:             [popularNyaa],
  ebooks:            [popular1337x],
  audiobooks:        [],
  cartoons:          [],
  balkan:            [],
  'balkan-cartoons': [],
};

// cache[category] = { data, fetchedAt, status }
const cache = {};

const INFOHASH_RE = /urn:btih:([a-f0-9]{40}|[A-Z2-7]{32})/i;
const QUALITY_TOKENS = /\b(1080p|2160p|720p|480p|BluRay|BDRip|BRRip|WEB-DL|WEBRip|HDRip|x264|x265|HEVC|HDR|DDP|AAC|DTS|FLAC|MP3|H\.?264|H\.?265|4K|UHD)\b|\(\d{4}\)|\b\d{4}\b/gi;

function extractInfohash(magnet) {
  if (!magnet) return null;
  const m = INFOHASH_RE.exec(magnet);
  return m ? m[1].toLowerCase() : null;
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(QUALITY_TOKENS, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function deduplicate(items) {
  const byHash = new Map();
  const byName = new Map();

  for (const item of items) {
    const hash = extractInfohash(item.magnet);
    const score = (item.seeds || 0) + (item.leechers || 0);

    if (hash) {
      const existing = byHash.get(hash);
      if (!existing || score > ((existing.seeds || 0) + (existing.leechers || 0))) {
        byHash.set(hash, item);
      }
      continue;
    }

    const norm = normalizeName(item.name || '');
    if (!norm) continue;

    const existing = byName.get(norm);
    if (!existing || score > ((existing.seeds || 0) + (existing.leechers || 0))) {
      byName.set(norm, item);
    }
  }

  // Merge: hash-keyed entries first; name-keyed fill the rest
  const seen = new Set();
  const merged = [];

  for (const item of byHash.values()) {
    merged.push(item);
    seen.add(normalizeName(item.name || ''));
  }

  for (const [norm, item] of byName) {
    if (!seen.has(norm)) {
      merged.push(item);
    }
  }

  merged.sort((a, b) => (b.seeds + b.leechers) - (a.seeds + a.leechers));
  return merged.slice(0, 100);
}

async function fetchCategory(category) {
  const sources = SOURCES[category];
  const TIMEOUT_MS = 30_000;

  const results = await Promise.allSettled(
    sources.map(scraper =>
      Promise.race([
        scraper.fetch(category),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
        ),
      ])
    )
  );

  const all = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
  const data = deduplicate(all);
  const entry = { data, fetchedAt: new Date(), status: 'fresh' };
  cache[category] = entry;
  return entry;
}

function isFresh(entry) {
  return entry && Date.now() - entry.fetchedAt.getTime() < TTL_MS;
}

async function getPopular(category) {
  if (!(category in SOURCES)) {
    throw new Error(`Unknown category: ${category}`);
  }

  if (SOURCES[category].length === 0) {
    return { data: [], fetchedAt: new Date(), status: 'no-data' };
  }

  const cached = cache[category];

  if (cached && isFresh(cached)) {
    return { data: cached.data, fetchedAt: cached.fetchedAt, status: 'fresh' };
  }

  if (cached) {
    // Stale — return immediately and refresh in background
    fetchCategory(category).catch(() => {});
    return { data: cached.data, fetchedAt: cached.fetchedAt, status: 'stale' };
  }

  // No cache — fetch synchronously
  return fetchCategory(category);
}

async function refreshPopular(category) {
  if (!(category in SOURCES)) {
    throw new Error(`Unknown category: ${category}`);
  }

  if (SOURCES[category].length === 0) {
    const entry = { data: [], fetchedAt: new Date(), status: 'no-data' };
    cache[category] = entry;
    return entry;
  }

  return fetchCategory(category);
}

// Background timer: refresh all non-empty categories every 6 hours
const _bgTimer = setInterval(async () => {
  for (const cat of Object.keys(SOURCES)) {
    if (SOURCES[cat].length === 0) continue;
    try { await fetchCategory(cat); } catch (_) {}
  }
}, TTL_MS);

module.exports = { getPopular, refreshPopular };

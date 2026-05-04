# Popular Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Fire Popular tab to UltimateTracker showing top 100 torrents per category, aggregated from multiple sites, ranked by seeds+leechers, with a 6-hour server-side cache.

**Architecture:** Ten dedicated browse scrapers fetch site-native top lists (no search query). The orchestrator `scrapers/popular.js` runs them in parallel per category, deduplicates by infohash then normalized name, and maintains an in-memory 6-hour cache. Two new Express JSON endpoints expose the data. `public/popular.js` handles all frontend tab rendering; `app.js` only adds the router entry.

**Tech Stack:** Node.js, Express, Cheerio, node-fetch — same as existing codebase. No new dependencies.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `scrapers/popular-tpb.js` | Create | TPB precompiled `data_top100_<cat>.json` API |
| `scrapers/popular-1337x.js` | Create | 1337x `/top-100-*` HTML pages |
| `scrapers/popular-yts.js` | Create | YTS `list_movies.json?sort_by=seeds` API |
| `scrapers/popular-eztv.js` | Create | EZTV API `eztv.re/api/get-torrents?sort_by=seeds` |
| `scrapers/popular-nyaa.js` | Create | Nyaa browse `?s=seeders&o=desc` (no query) |
| `scrapers/popular-tgx.js` | Create | TorrentGalaxy `torrents.php?cat=N&sort=seeders` |
| `scrapers/popular-lime.js` | Create | LimeTorrents `/top-torrents/<cat>/1/` pages |
| `scrapers/popular-solid.js` | Create | SolidTorrents API `?q=&sort=seeders` |
| `scrapers/popular-abb.js` | Create | AudioBookBay homepage browse |
| `scrapers/popular.js` | Create | Cache, dedup, `getPopular()`, `refreshPopular()`, background timer |
| `server.js` | Modify | Add `GET /api/popular/:category` + `POST /api/popular/:category/refresh` |
| `public/popular.js` | Create | Popular tab rendering: pills, table, refresh button |
| `public/index.html` | Modify | Add Popular nav button, Popular section HTML, script tag |
| `public/app.js` | Modify | Add `#popular` route entry, delegate to `showPopular()` |
| `public/style.css` | Modify | Add `.popular-section`, `.popular-pills`, `.popular-meta` |

---

## Task 1: popular-tpb.js — TPB Top 100 API

**Files:**
- Create: `scrapers/popular-tpb.js`

TPB exposes precompiled top100 JSON at `apibay.org/precompiled/data_top100_<cat>.json`.
Category keys: `all`, `100` (audio), `200` (video), `300` (apps), `400` (games), `102` (audiobooks), `601` (ebooks).

- [ ] **Step 1: Create the scraper**

```js
// scrapers/popular-tpb.js
const BaseScraper = require('./base');

class PopularTPB extends BaseScraper {
  constructor() {
    super('The Pirate Bay', 'https://apibay.org');
  }

  static TOP_CAT = {
    all: 'all', movies: '200', tv: '200', anime: '200', cartoons: '200',
    music: '100', audiobooks: '102', ebooks: '601', software: '300', games: '400',
  };

  async browse(category) {
    const cat = PopularTPB.TOP_CAT[category] || 'all';
    const data = await this.fetchJSON(`${this.baseUrl}/precompiled/data_top100_${cat}.json`);
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      name: item.name,
      size: this.formatSize(parseInt(item.size)),
      sizeBytes: parseInt(item.size) || 0,
      seeds: parseInt(item.seeders) || 0,
      leechers: parseInt(item.leechers) || 0,
      source: this.name,
      sourceUrl: `https://thepiratebay.org/description.php?id=${item.id}`,
      magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337`,
      date: item.added ? new Date(parseInt(item.added) * 1000).toISOString().split('T')[0] : 'N/A',
      category,
    }));
  }
}

module.exports = new PopularTPB();
```

- [ ] **Step 2: Verify**

```bash
node -e "require('./scrapers/popular-tpb').browse('movies').then(r => { console.log('Count:', r.length); console.log('Top 3:', r.slice(0,3).map(x => x.name + ' | s:' + x.seeds)); }).catch(console.error)"
```

Expected: Count 100, movie names with seed counts.

- [ ] **Step 3: Commit**

```bash
git add scrapers/popular-tpb.js && git commit -m "feat: add TPB top100 popular scraper"
```

---

## Task 2: popular-1337x.js — 1337x Top-100 Pages

**Files:**
- Create: `scrapers/popular-1337x.js`

1337x has `/top-100`, `/top-100-movies`, `/top-100-tv`, `/top-100-music`, `/top-100-games`, `/top-100-apps`, `/top-100-other`. Uses same `table.table-list tbody tr` structure as search. Magnet fetching is skipped to keep it fast — detail URLs are set as sourceUrl.

- [ ] **Step 1: Create the scraper**

```js
// scrapers/popular-1337x.js
const BaseScraper = require('./base');

class Popular1337x extends BaseScraper {
  constructor() {
    super('1337x', 'https://www.1337xx.to');
  }

  static TOP_PATH = {
    all: '/top-100', movies: '/top-100-movies', tv: '/top-100-tv',
    music: '/top-100-music', games: '/top-100-games', software: '/top-100-apps',
    ebooks: '/top-100-other', audiobooks: '/top-100-other',
    anime: '/top-100', cartoons: '/top-100',
  };

  async browse(category) {
    const path = Popular1337x.TOP_PATH[category] || '/top-100';
    const html = await this.fetchPage(`${this.baseUrl}${path}`);
    const $ = this.parseHTML(html);
    const results = [];

    $('table.table-list tbody tr').each((i, row) => {
      const nameLink = $(row).find('td.name a:nth-child(2)');
      const name = nameLink.text().trim();
      const detailPath = nameLink.attr('href');
      const seeds = parseInt($(row).find('td.seeds').text().trim()) || 0;
      const leechers = parseInt($(row).find('td.leeches').text().trim()) || 0;
      const size = $(row).find('td.size').clone().children().remove().end().text().trim();
      const date = $(row).find('td.coll-date').text().trim();
      if (name) {
        results.push({
          name, seeds, leechers,
          size: size || 'N/A',
          sizeBytes: this.parseSizeToBytes(size),
          source: this.name,
          sourceUrl: detailPath ? `${this.baseUrl}${detailPath}` : this.baseUrl,
          magnet: null,
          date: date || 'N/A',
          category,
        });
      }
    });
    return results;
  }

  parseSizeToBytes(sizeStr) {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|TB)/i);
    if (!match) return 0;
    const multipliers = { KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
    return Math.round(parseFloat(match[1]) * (multipliers[match[2].toUpperCase()] || 1));
  }
}

module.exports = new Popular1337x();
```

- [ ] **Step 2: Verify**

```bash
node -e "require('./scrapers/popular-1337x').browse('movies').then(r => { console.log('Count:', r.length); console.log('Top 3:', r.slice(0,3).map(x => x.name + ' | s:' + x.seeds)); }).catch(console.error)"
```

- [ ] **Step 3: Commit**

```bash
git add scrapers/popular-1337x.js && git commit -m "feat: add 1337x top-100 popular scraper"
```

---

## Task 3: popular-yts.js — YTS Movies by Seeds

**Files:**
- Create: `scrapers/popular-yts.js`

YTS `list_movies` API returns movies with all quality variants. Only relevant for `movies` and `all`.

- [ ] **Step 1: Create the scraper**

```js
// scrapers/popular-yts.js
const BaseScraper = require('./base');

class PopularYTS extends BaseScraper {
  constructor() { super('YTS', 'https://yts.torrentbay.st'); }

  async browse(category) {
    if (!['movies', 'all'].includes(category)) return [];
    const data = await this.fetchJSON(`${this.baseUrl}/api/v2/list_movies.json?sort_by=seeds&limit=50&page=1`);
    if (!data?.data?.movies) return [];

    const results = [];
    for (const movie of data.data.movies) {
      if (!movie.torrents) continue;
      for (const t of movie.torrents) {
        const trackers = ['udp://open.demonii.com:1337/announce', 'udp://tracker.opentrackr.org:1337/announce']
          .map(tr => `&tr=${encodeURIComponent(tr)}`).join('');
        results.push({
          name: `${movie.title} (${movie.year}) [${t.quality}]`,
          size: t.size || 'N/A', sizeBytes: t.size_bytes || 0,
          seeds: t.seeds || 0, leechers: t.peers || 0,
          source: this.name, sourceUrl: movie.url,
          magnet: `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(movie.title)}${trackers}`,
          date: t.date_uploaded ? t.date_uploaded.split(' ')[0] : 'N/A',
          category: 'movies',
        });
      }
    }
    return results;
  }
}

module.exports = new PopularYTS();
```

- [ ] **Step 2: Verify**

```bash
node -e "require('./scrapers/popular-yts').browse('movies').then(r => { console.log('Count:', r.length); console.log('Top 3:', r.slice(0,3).map(x => x.name + ' | s:' + x.seeds)); }).catch(console.error)"
```

- [ ] **Step 3: Commit**

```bash
git add scrapers/popular-yts.js && git commit -m "feat: add YTS popular scraper"
```

---

## Task 4: popular-eztv.js — EZTV JSON API

**Files:**
- Create: `scrapers/popular-eztv.js`

EZTV provides `eztv.re/api/get-torrents` (different domain from search scraper's `eztvx.to`). Only relevant for `tv` and `all`. Note: leechers not in EZTV API, stays 0.

- [ ] **Step 1: Create the scraper**

```js
// scrapers/popular-eztv.js
const BaseScraper = require('./base');

class PopularEZTV extends BaseScraper {
  constructor() { super('EZTV', 'https://eztv.re'); }

  async browse(category) {
    if (!['tv', 'all'].includes(category)) return [];
    const data = await this.fetchJSON(`${this.baseUrl}/api/get-torrents?limit=100&sort_by=seeds`);
    if (!data?.torrents) return [];
    return data.torrents.map(item => ({
      name: item.title || 'N/A',
      size: this.formatSize(parseInt(item.size_bytes)),
      sizeBytes: parseInt(item.size_bytes) || 0,
      seeds: parseInt(item.seeds) || 0,
      leechers: 0,
      source: this.name,
      sourceUrl: item.episode_url || this.baseUrl,
      magnet: item.magnet_url || null,
      date: item.date_released_unix
        ? new Date(parseInt(item.date_released_unix) * 1000).toISOString().split('T')[0]
        : 'N/A',
      category: 'tv',
    }));
  }
}

module.exports = new PopularEZTV();
```

- [ ] **Step 2: Verify** (if `sort_by=seeds` is rejected, remove that param and retry)

```bash
node -e "require('./scrapers/popular-eztv').browse('tv').then(r => { console.log('Count:', r.length); console.log('Top:', r[0]?.name, '| s:', r[0]?.seeds); }).catch(console.error)"
```

- [ ] **Step 3: Commit**

```bash
git add scrapers/popular-eztv.js && git commit -m "feat: add EZTV popular scraper"
```

---

## Task 5: popular-nyaa.js — Nyaa Browse by Seeders

**Files:**
- Create: `scrapers/popular-nyaa.js`

The existing Nyaa search scraper uses `?s=seeders&o=desc`. Dropping `q=` browses all anime by seeders. Only relevant for `anime`, `cartoons`, `all`.

- [ ] **Step 1: Create the scraper**

```js
// scrapers/popular-nyaa.js
const BaseScraper = require('./base');

class PopularNyaa extends BaseScraper {
  constructor() { super('Nyaa', 'https://nyaa.si'); }

  async browse(category) {
    if (!['anime', 'cartoons', 'all'].includes(category)) return [];
    const html = await this.fetchPage(`${this.baseUrl}/?f=0&c=0_0&s=seeders&o=desc`);
    const $ = this.parseHTML(html);
    const results = [];

    $('table.torrent-list tbody tr').each((i, row) => {
      const cols = $(row).find('td');
      const nameLink = cols.eq(1).find('a:not(.comments)').last();
      const name = nameLink.text().trim();
      const href = nameLink.attr('href');
      const magnetLink = cols.eq(2).find('a[href^="magnet:"]').attr('href');
      const size = cols.eq(3).text().trim();
      const date = cols.eq(4).text().trim();
      const seeds = parseInt(cols.eq(5).text().trim()) || 0;
      const leechers = parseInt(cols.eq(6).text().trim()) || 0;
      if (name) {
        results.push({
          name, seeds, leechers,
          size: size || 'N/A', sizeBytes: this.parseSizeToBytes(size),
          source: this.name,
          sourceUrl: href ? `${this.baseUrl}${href}` : this.baseUrl,
          magnet: magnetLink || null,
          date: date || 'N/A', category: 'anime',
        });
      }
    });
    return results;
  }

  parseSizeToBytes(sizeStr) {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.]+)\s*(KiB|MiB|GiB|TiB|KB|MB|GB|TB)/i);
    if (!match) return 0;
    const unit = match[2].toUpperCase().replace('IB', 'B').replace('I', '');
    const multipliers = { KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
    return Math.round(parseFloat(match[1]) * (multipliers[unit] || 1));
  }
}

module.exports = new PopularNyaa();
```

- [ ] **Step 2: Verify**

```bash
node -e "require('./scrapers/popular-nyaa').browse('anime').then(r => { console.log('Count:', r.length); console.log('Top 3:', r.slice(0,3).map(x => x.name + ' | s:' + x.seeds)); }).catch(console.error)"
```

- [ ] **Step 3: Commit**

```bash
git add scrapers/popular-nyaa.js && git commit -m "feat: add Nyaa browse-by-seeders popular scraper"
```

---

## Task 6: popular-tgx.js — TorrentGalaxy Category Browse

**Files:**
- Create: `scrapers/popular-tgx.js`

TGX category IDs: Movies=3, TV=41, Music=22, Games=10, Apps=20, Anime=28. URL: `/torrents.php?cat=N&sort=seeders&order=desc`. Reuses same CSS selectors as existing `torrentgalaxy.js`.

- [ ] **Step 1: Create the scraper**

```js
// scrapers/popular-tgx.js
const BaseScraper = require('./base');

class PopularTGX extends BaseScraper {
  constructor() { super('TorrentGalaxy', 'https://torrentgalaxy.org'); }

  static CAT_ID = {
    all: null, movies: 3, tv: 41, music: 22,
    games: 10, software: 20, anime: 28, cartoons: 15,  // 15 = Animation (not Anime)
  };

  async browse(category) {
    const catId = PopularTGX.CAT_ID[category];
    if (catId === undefined) return [];
    const catParam = catId ? `&cat=${catId}` : '';
    const html = await this.fetchPage(`${this.baseUrl}/torrents.php?sort=seeders&order=desc${catParam}`);
    const $ = this.parseHTML(html);
    const results = [];

    $('div.tgxtablerow').each((i, row) => {
      const nameLink = $(row).find('div.tgxtablecell a.txlight').first();
      if (!nameLink.length) return;
      const name = nameLink.text().trim();
      const href = nameLink.attr('href');
      const magnetLink = $(row).find('a[href^="magnet:"]').attr('href');
      const cells = $(row).find('div.tgxtablecell');
      const size = cells.eq(7).text().trim() || 'N/A';
      const seeds = parseInt($(row).find('font[color="green"]').first().text().trim()) || 0;
      const leechers = parseInt($(row).find('font[color="#ff0000"]').first().text().trim()) || 0;
      const date = cells.eq(11).text().trim() || 'N/A';
      if (name) {
        results.push({
          name, seeds, leechers,
          size: size || 'N/A', sizeBytes: this.parseSizeToBytes(size),
          source: this.name,
          sourceUrl: href ? `${this.baseUrl}${href}` : this.baseUrl,
          magnet: magnetLink || null,
          date, category,
        });
      }
    });
    return results;
  }

  parseSizeToBytes(sizeStr) {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|TB)/i);
    if (!match) return 0;
    const multipliers = { KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
    return Math.round(parseFloat(match[1]) * (multipliers[match[2].toUpperCase()] || 1));
  }
}

module.exports = new PopularTGX();
```

- [ ] **Step 2: Verify**

```bash
node -e "require('./scrapers/popular-tgx').browse('movies').then(r => { console.log('Count:', r.length); console.log('Top 3:', r.slice(0,3).map(x => x.name + ' | s:' + x.seeds)); }).catch(console.error)"
```

- [ ] **Step 3: Commit**

```bash
git add scrapers/popular-tgx.js && git commit -m "feat: add TorrentGalaxy category-browse popular scraper"
```

---

## Task 7: popular-lime.js — LimeTorrents Top Lists

**Files:**
- Create: `scrapers/popular-lime.js`

LimeTorrents top-torrents pages: `/top-torrents/<cat>/1/`. Categories: `all`, `movies`, `tv`, `music`, `games`, `applications`. Same table structure as search scraper.

- [ ] **Step 1: Create the scraper**

```js
// scrapers/popular-lime.js
const BaseScraper = require('./base');

class PopularLime extends BaseScraper {
  constructor() { super('LimeTorrents', 'https://www.limetorrents.lol'); }

  static TOP_PATH = {
    all: '/top-torrents/all/1/', movies: '/top-torrents/movies/1/',
    tv: '/top-torrents/tv/1/', music: '/top-torrents/music/1/',
    games: '/top-torrents/games/1/', software: '/top-torrents/applications/1/',
  };

  async browse(category) {
    const path = PopularLime.TOP_PATH[category];
    if (!path) return [];
    const html = await this.fetchPage(`${this.baseUrl}${path}`);
    const $ = this.parseHTML(html);
    const results = [];

    $('table.table2 tr').each((i, row) => {
      if (i === 0) return;
      const cols = $(row).find('td');
      if (cols.length < 5) return;
      const nameLink = cols.eq(0).find('a').first();
      const name = nameLink.text().trim();
      const href = nameLink.attr('href');
      const date = cols.eq(1).text().trim();
      const size = cols.eq(2).text().trim();
      const seeds = parseInt(cols.eq(3).text().trim().replace(/,/g, '')) || 0;
      const leechers = parseInt(cols.eq(4).text().trim().replace(/,/g, '')) || 0;
      if (name && href) {
        results.push({
          name, seeds, leechers,
          size: size || 'N/A', sizeBytes: this.parseSizeToBytes(size),
          source: this.name,
          sourceUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
          magnet: null, date: date || 'N/A', category,
        });
      }
    });
    return results;
  }

  parseSizeToBytes(sizeStr) {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|TB)/i);
    if (!match) return 0;
    const multipliers = { KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
    return Math.round(parseFloat(match[1]) * (multipliers[match[2].toUpperCase()] || 1));
  }
}

module.exports = new PopularLime();
```

- [ ] **Step 2: Verify**

```bash
node -e "require('./scrapers/popular-lime').browse('movies').then(r => { console.log('Count:', r.length); console.log('Top 3:', r.slice(0,3).map(x => x.name + ' | s:' + x.seeds)); }).catch(console.error)"
```

- [ ] **Step 3: Commit**

```bash
git add scrapers/popular-lime.js && git commit -m "feat: add LimeTorrents top-torrents popular scraper"
```

---

## Task 8: popular-solid.js — SolidTorrents Browse

**Files:**
- Create: `scrapers/popular-solid.js`

SolidTorrents API supports empty query `?q=&sort=seeders`. If the API rejects an empty query, use a minimal wildcard. Only contributes to `all`, `movies`, `games`, `software`.

- [ ] **Step 1: Create the scraper**

```js
// scrapers/popular-solid.js
const BaseScraper = require('./base');

class PopularSolid extends BaseScraper {
  constructor() { super('SolidTorrents', 'https://solidtorrents.to'); }

  async browse(category) {
    if (!['all', 'movies', 'games', 'software'].includes(category)) return [];
    const data = await this.fetchJSON(`${this.baseUrl}/api/v1/search?q=&sort=seeders&limit=50`);
    if (!data?.results) return [];
    return data.results.map(item => ({
      name: item.title || 'N/A',
      size: this.formatSize(item.size), sizeBytes: item.size || 0,
      seeds: item.swarm?.seeders || 0, leechers: item.swarm?.leechers || 0,
      source: this.name,
      sourceUrl: `${this.baseUrl}/view/${item._id}`,
      magnet: item.magnet || null,
      date: item.imported ? new Date(item.imported).toISOString().split('T')[0] : 'N/A',
      category,
    }));
  }
}

module.exports = new PopularSolid();
```

- [ ] **Step 2: Verify** (if empty query is rejected, change `q=` to `q=the` as fallback)

```bash
node -e "require('./scrapers/popular-solid').browse('all').then(r => { console.log('Count:', r.length); console.log('Top:', r[0]?.name, '| s:', r[0]?.seeds); }).catch(console.error)"
```

- [ ] **Step 3: Commit**

```bash
git add scrapers/popular-solid.js && git commit -m "feat: add SolidTorrents popular scraper"
```

---

## Task 9: popular-abb.js — AudioBookBay Browse

**Files:**
- Create: `scrapers/popular-abb.js`

AudioBookBay's homepage lists recent audiobooks. No seed/leech counts available — seeds stay 0. Only for `audiobooks` and `all`.

- [ ] **Step 1: Create the scraper**

```js
// scrapers/popular-abb.js
const BaseScraper = require('./base');

class PopularABB extends BaseScraper {
  constructor() { super('AudioBookBay', 'https://audiobookbay.lu'); }

  async browse(category) {
    if (!['audiobooks', 'all'].includes(category)) return [];
    const html = await this.fetchPage(`${this.baseUrl}/`);
    const $ = this.parseHTML(html);
    const results = [];

    $('div.post').each((i, el) => {
      if (i >= 50) return false;
      const titleEl = $(el).find('div.postTitle h2 a');
      const name = titleEl.text().trim();
      const href = titleEl.attr('href');
      if (!name || !href) return;

      const contentText = $(el).find('div.postContent').text();
      const sizeMatch = contentText.match(/File Size:\s*([\d.]+)\s*(\w+)/i);
      const size = sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : 'N/A';
      const formatMatch = contentText.match(/Format:\s*(\S+)/i);
      const format = formatMatch ? formatMatch[1] : '';
      const fullUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;

      results.push({
        name: format ? `${name} [${format}]` : name,
        size, sizeBytes: 0, seeds: 0, leechers: 0,
        source: this.name, sourceUrl: fullUrl,
        magnet: null, date: 'N/A', category: 'audiobooks',
      });
    });
    return results;
  }
}

module.exports = new PopularABB();
```

- [ ] **Step 2: Verify**

```bash
node -e "require('./scrapers/popular-abb').browse('audiobooks').then(r => { console.log('Count:', r.length); console.log('Top 3:', r.slice(0,3).map(x => x.name)); }).catch(console.error)"
```

- [ ] **Step 3: Commit**

```bash
git add scrapers/popular-abb.js && git commit -m "feat: add AudioBookBay browse popular scraper"
```

---

## Task 10: popular.js — Orchestrator, Cache, Deduplication

**Files:**
- Create: `scrapers/popular.js`

Owns the cache, runs scrapers in parallel per category, deduplicates, exposes `getPopular(category)` and `refreshPopular(category)`. The background timer refreshes all categories every 6 hours.

- [ ] **Step 1: Create the orchestrator**

```js
// scrapers/popular.js
const CACHE_TTL = 6 * 60 * 60 * 1000;  // 6 hours
const SCRAPER_TIMEOUT = 30 * 1000;       // 30 seconds per scraper

const tpb   = require('./popular-tpb');
const x1337 = require('./popular-1337x');
const yts   = require('./popular-yts');
const eztv  = require('./popular-eztv');
const nyaa  = require('./popular-nyaa');
const tgx   = require('./popular-tgx');
const lime  = require('./popular-lime');
const solid = require('./popular-solid');
const abb   = require('./popular-abb');

const SOURCES = {
  all:        [tpb, x1337, tgx, solid],
  movies:     [tpb, x1337, yts, tgx, lime],
  tv:         [tpb, x1337, eztv, tgx, lime],
  music:      [tpb, x1337, tgx, lime],
  games:      [tpb, x1337, tgx, solid],
  software:   [tpb, x1337, tgx, solid],
  anime:      [nyaa, x1337],
  cartoons:   [tpb, x1337, tgx],
  ebooks:     [tpb, x1337],
  audiobooks: [abb, tpb],
};

// In-memory cache keyed by category
const cache = {};

function extractInfohash(magnet) {
  if (!magnet) return null;
  const m = magnet.match(/urn:btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i);
  return m ? m[1].toLowerCase() : null;
}

function normalizeName(name) {
  return name.toLowerCase()
    .replace(/\b(1080p|2160p|720p|480p|4k|uhd|bluray|blu-ray|web-dl|webrip|hdtv|hdrip|dvdrip|x264|x265|hevc|avc|aac|mp3|flac|mkv|mp4|avi)\b/g, '')
    .replace(/[([]\d{4}[\])]|\(\d{4}\)/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function deduplicate(results) {
  const seen = new Map();
  for (const r of results) {
    const score = (r.seeds || 0) + (r.leechers || 0);
    const key = extractInfohash(r.magnet) || normalizeName(r.name);
    if (!key) continue;
    const prev = seen.get(key);
    if (!prev || score > (prev.seeds + prev.leechers)) seen.set(key, r);
  }
  return [...seen.values()]
    .sort((a, b) => (b.seeds + b.leechers) - (a.seeds + a.leechers))
    .slice(0, 100);
}

async function fetchCategory(category) {
  const scrapers = SOURCES[category] || SOURCES.all;
  const settled = await Promise.allSettled(
    scrapers.map(s =>
      Promise.race([
        s.browse(category),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), SCRAPER_TIMEOUT)),
      ])
    )
  );
  const all = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
  return deduplicate(all);
}

async function getPopular(category) {
  const cat = category || 'all';
  const entry = cache[cat];
  const now = Date.now();

  if (entry && entry.status === 'fresh' && (now - entry.fetchedAt) < CACHE_TTL) {
    return { data: entry.data, fetchedAt: entry.fetchedAt, status: 'fresh' };
  }

  if (entry?.data?.length && (now - entry.fetchedAt) >= CACHE_TTL) {
    if (entry.status !== 'fetching') {
      entry.status = 'fetching';
      fetchCategory(cat)
        .then(data => { cache[cat] = { data, fetchedAt: Date.now(), status: 'fresh' }; })
        .catch(() => { if (cache[cat]) cache[cat].status = 'stale'; });
    }
    return { data: entry.data, fetchedAt: entry.fetchedAt, status: 'stale' };
  }

  // Cache miss — synchronous fetch (first request for this category)
  cache[cat] = { data: [], fetchedAt: 0, status: 'fetching' };
  const data = await fetchCategory(cat);
  cache[cat] = { data, fetchedAt: Date.now(), status: 'fresh' };
  return { data, fetchedAt: cache[cat].fetchedAt, status: 'fresh' };
}

async function refreshPopular(category) {
  const cat = category || 'all';
  if (cache[cat]) cache[cat].status = 'fetching';
  const data = await fetchCategory(cat);
  cache[cat] = { data, fetchedAt: Date.now(), status: 'fresh' };
}

// Background refresh every 6 hours
const ALL_CATS = Object.keys(SOURCES);
setInterval(async () => {
  console.log('[Popular] Starting background refresh...');
  for (const cat of ALL_CATS) {
    try { await refreshPopular(cat); console.log(`[Popular] Refreshed: ${cat}`); }
    catch (e) { console.error(`[Popular] Refresh failed for ${cat}:`, e.message); }
  }
}, CACHE_TTL);

module.exports = { getPopular, refreshPopular };
```

- [ ] **Step 2: Verify orchestrator fetches and deduplicates**

```bash
node -e "
const { getPopular } = require('./scrapers/popular');
console.log('Fetching movies (first call - may take 10-20s)...');
getPopular('movies').then(r => {
  console.log('Status:', r.status, '| Count:', r.data.length);
  console.log('Top 5:');
  r.data.slice(0,5).forEach((x,i) => console.log(i+1, x.name, '| combined:', x.seeds+x.leechers, '| src:', x.source));
}).catch(console.error);
"
```

Expected: status `fresh`, up to 100 results, sorted by combined desc, no duplicates.

- [ ] **Step 3: Spot-check no duplicates**

```bash
node -e "
const { getPopular } = require('./scrapers/popular');
getPopular('all').then(r => {
  const names = r.data.map(x => x.name);
  const unique = new Set(names);
  console.log('Total:', r.data.length, '| Unique:', unique.size, '- should match');
}).catch(console.error);
"
```

- [ ] **Step 4: Commit**

```bash
git add scrapers/popular.js && git commit -m "feat: add popular orchestrator with cache and deduplication"
```

---

## Task 11: server.js — API Endpoints

**Files:**
- Modify: `server.js`

Add import at top and two routes before `app.listen`.

- [ ] **Step 1: Add import**

After the existing `require` lines at the top of `server.js`, add:

```js
const { getPopular, refreshPopular } = require('./scrapers/popular');
```

- [ ] **Step 2: Add routes before `app.listen`**

```js
// Popular endpoints
app.get('/api/popular/:category', async (req, res) => {
  const { category } = req.params;
  try {
    const result = await getPopular(category);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, data: [], status: 'error' });
  }
});

app.post('/api/popular/:category/refresh', async (req, res) => {
  const { category } = req.params;
  try {
    await refreshPopular(category);
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 3: Start server and verify GET**

```bash
node server.js &
sleep 3
curl -s "http://localhost:7777/api/popular/movies" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const r=JSON.parse(d); console.log('status:', r.status, '| count:', r.data.length, '| top:', r.data[0]?.name)"
```

Expected: `status: fresh | count: 100 | top: <movie name>`

- [ ] **Step 4: Verify POST refresh**

```bash
curl -s -X POST "http://localhost:7777/api/popular/movies/refresh"
```

Expected: `{"status":"ok"}`

Stop server: `pkill -f "node server.js"`

- [ ] **Step 5: Commit**

```bash
git add server.js && git commit -m "feat: add /api/popular/* endpoints to server"
```

---

## Task 12: public/popular.js — Frontend Module

**Files:**
- Create: `public/popular.js`

All Popular tab logic. Uses `textContent` and DOM APIs for all user-provided data (torrent names, sources, URLs) to prevent XSS. Static structural HTML uses `table.rows` / `insertRow` approach.

- [ ] **Step 1: Create the module**

```js
// public/popular.js
(function () {
  'use strict';

  const CATEGORIES = [
    { id: 'all',             name: 'All',             icon: 'Globe' },
    { id: 'movies',          name: 'Movies',          icon: 'Movie' },
    { id: 'tv',              name: 'TV',              icon: 'TV' },
    { id: 'music',           name: 'Music',           icon: 'Music' },
    { id: 'games',           name: 'Games',           icon: 'Games' },
    { id: 'software',        name: 'Software',        icon: 'PC' },
    { id: 'anime',           name: 'Anime',           icon: 'Anime' },
    { id: 'ebooks',          name: 'eBooks',          icon: 'Books' },
    { id: 'audiobooks',      name: 'Audiobooks',      icon: 'Audio' },
    { id: 'cartoons',        name: 'Cartoons',        icon: 'Art' },
    { id: 'balkan',          name: 'Balkan',          icon: 'HR' },
    { id: 'balkan-cartoons', name: 'Balkan Cartoons', icon: 'Art' },
  ];

  // Categories with no data (sources don't provide seed counts)
  const NO_DATA = new Set(['balkan', 'balkan-cartoons']);

  // Map category id to emoji (matches app.js pattern)
  const CAT_ICONS = {
    all: '\u{1F310}', movies: '\u{1F3AC}', tv: '\u{1F4FA}', music: '\u{1F3B5}',
    games: '\u{1F3AE}', software: '\u{1F4BB}', anime: '⛩️', ebooks: '\u{1F4D6}',
    audiobooks: '\u{1F3A7}', cartoons: '\u{1F3A8}', balkan: '\u{1F1ED}\u{1F1F7}', 'balkan-cartoons': '\u{1F3A8}',
  };

  let currentCategory = 'all';

  function timeAgo(ts) {
    if (!ts) return 'never';
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  // SOURCE_META is defined inside app.js's IIFE and not accessible here.
  // Duplicate the relevant entries directly in popular.js.
  const SOURCE_ICONS = {
    'The Pirate Bay': { icon: '🏴‍☠️', color: '#2ecc71' },
    '1337x':          { icon: '🔥',    color: '#e74c3c' },
    'YTS':            { icon: '🎬',    color: '#f1c40f' },
    'EZTV':           { icon: '📺',    color: '#3498db' },
    'Nyaa':           { icon: '⛩️',   color: '#9b59b6' },
    'TorrentGalaxy':  { icon: '🌌',    color: '#e67e22' },
    'LimeTorrents':   { icon: '🍋',    color: '#27ae60' },
    'SolidTorrents':  { icon: '💎',    color: '#2980b9' },
    'AudioBookBay':   { icon: '🎧',    color: '#ff6f00' },
  };

  function getSourceMeta(name) {
    return SOURCE_ICONS[name] || { icon: '🔗', color: '#64748b' };
  }

  function renderPills(section) {
    const container = section.querySelector('.popular-pills');
    container.textContent = '';
    CATEGORIES.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'popular-pill' + (c.id === currentCategory ? ' active' : '');
      btn.dataset.cat = c.id;
      btn.textContent = `${CAT_ICONS[c.id] || ''} ${c.name}`;
      btn.addEventListener('click', () => {
        currentCategory = c.id;
        showPopular(currentCategory);
      });
      container.appendChild(btn);
    });
  }

  function buildRefreshBtn(meta, onRefresh) {
    const btn = document.createElement('button');
    btn.className = 'popular-refresh-btn';
    btn.textContent = '\u{1F504} Refresh';
    btn.addEventListener('click', onRefresh);
    meta.appendChild(btn);
    return btn;
  }

  function setMeta(section, text, isStale, onRefresh) {
    const meta = section.querySelector('.popular-meta');
    meta.textContent = '';
    const span = document.createElement('span');
    span.textContent = `Last refreshed: ${text}`;
    meta.appendChild(span);
    if (isStale) {
      const em = document.createElement('em');
      em.textContent = ' · Refreshing in background…';
      meta.appendChild(em);
    }
    meta.appendChild(document.createTextNode(' '));
    buildRefreshBtn(meta, onRefresh);
  }

  function setLoading(section) {
    const meta = section.querySelector('.popular-meta');
    const tbody = section.querySelector('.popular-tbody');
    meta.textContent = 'Loading…';
    tbody.textContent = '';
    const tr = tbody.insertRow();
    const td = tr.insertCell();
    td.colSpan = 7;
    td.style.cssText = 'text-align:center;padding:2rem';
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.margin = '0 auto';
    td.appendChild(spinner);
  }

  function setNoData(section, message) {
    const tbody = section.querySelector('.popular-tbody');
    tbody.textContent = '';
    const tr = tbody.insertRow();
    const td = tr.insertCell();
    td.colSpan = 7;
    td.style.cssText = 'text-align:center;padding:2rem;color:#64748b';
    td.textContent = message;
  }

  function renderRows(section, data) {
    const tbody = section.querySelector('.popular-tbody');
    tbody.textContent = '';
    data.forEach((r, i) => {
      const src = getSourceMeta(r.source);
      const combined = (r.seeds || 0) + (r.leechers || 0);
      const tr = tbody.insertRow();

      // Rank
      const tdRank = tr.insertCell();
      tdRank.className = 'rank-num';
      tdRank.textContent = i + 1;

      // Name
      const tdName = tr.insertCell();
      tdName.className = 'torrent-name';
      tdName.title = r.name;
      tdName.textContent = r.name;

      // Seeds
      const tdSeeds = tr.insertCell();
      tdSeeds.className = 'col-seeds';
      tdSeeds.textContent = (r.seeds || 0).toLocaleString();

      // Leechers
      const tdLeech = tr.insertCell();
      tdLeech.className = 'col-leechers';
      tdLeech.textContent = (r.leechers || 0).toLocaleString();

      // Combined
      const tdComb = tr.insertCell();
      tdComb.textContent = combined.toLocaleString();

      // Source badge
      const tdSrc = tr.insertCell();
      const badge = document.createElement('span');
      badge.className = 'source-badge';
      badge.style.borderColor = src.color;
      badge.textContent = `${src.icon} ${r.source}`;
      tdSrc.appendChild(badge);

      // Action: magnet or source link
      const tdAct = tr.insertCell();
      const link = document.createElement('a');
      link.href = r.magnet || r.sourceUrl;
      if (!r.magnet) link.target = '_blank';
      link.title = r.magnet ? 'Open magnet' : 'View source';
      link.textContent = r.magnet ? '⚡' : '\u{1F517}';
      link.className = r.magnet ? 'magnet-btn' : 'source-link';
      tdAct.appendChild(link);
    });
  }

  window.showPopular = async function (category) {
    currentCategory = category || currentCategory;
    const section = document.getElementById('popularSection');
    if (!section) return;

    // Hide other sections
    ['searchSection', 'resultsSection', 'rankingsSection'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    section.style.display = 'block';

    renderPills(section);

    if (NO_DATA.has(currentCategory)) {
      section.querySelector('.popular-meta').textContent = '';
      setNoData(section, 'No popularity data available for this category (sources do not provide seed/leech counts).');
      return;
    }

    setLoading(section);

    const onRefresh = async () => {
      setLoading(section);
      try {
        await fetch(`/api/popular/${currentCategory}/refresh`, { method: 'POST' });
        await loadAndRender();
      } catch (e) {
        section.querySelector('.popular-meta').textContent = 'Refresh failed — try again.';
      }
    };

    async function loadAndRender() {
      const resp = await fetch(`/api/popular/${currentCategory}`);
      const result = await resp.json();
      if (!result.data || result.data.length === 0) {
        setMeta(section, timeAgo(result.fetchedAt), result.status === 'stale', onRefresh);
        setNoData(section, 'Unable to load popular torrents — try refreshing.');
        return;
      }
      setMeta(section, timeAgo(result.fetchedAt), result.status === 'stale', onRefresh);
      renderRows(section, result.data);
    }

    try {
      await loadAndRender();
    } catch (e) {
      section.querySelector('.popular-meta').textContent = '';
      setNoData(section, 'Failed to load — check server connection.');
    }
  };
}());
```

- [ ] **Step 2: Commit (full UI test in Task 16)**

```bash
git add public/popular.js && git commit -m "feat: add popular tab frontend module"
```

---

## Task 13: public/index.html — Nav + Popular Section

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add Popular nav button**

Find:
```html
        <button class="nav-btn" data-page="rankings" id="navRankings">
```

Insert before it:
```html
        <button class="nav-btn" data-page="popular" id="navPopular">Fire Popular</button>
```

(Use the fire emoji 🔥 in the actual file — written here as "Fire" to avoid encoding issues in the plan.)

- [ ] **Step 2: Add Popular section after Rankings section**

Find the closing `</section>` of the Rankings section (`id="rankingsSection"`) and insert immediately after:

```html
    <!-- Popular Section -->
    <section class="popular-section" id="popularSection" style="display:none;">
      <h2 class="rankings-title">Fire <span class="accent">Popular</span> Torrents</h2>
      <p class="rankings-sub">Top 100 per category ranked by seeds + leechers</p>
      <div class="popular-pills"></div>
      <div class="popular-meta"></div>
      <div class="table-wrapper" style="margin-top:1rem;">
        <table class="results-table">
          <thead>
            <tr>
              <th style="width:3rem;">#</th>
              <th>Name</th>
              <th class="col-seeds">Seeds</th>
              <th class="col-leechers">Leechers</th>
              <th>Combined</th>
              <th>Source</th>
              <th>Get</th>
            </tr>
          </thead>
          <tbody class="popular-tbody"></tbody>
        </table>
      </div>
    </section>
```

- [ ] **Step 3: Add script tag**

Change:
```html
  <script src="app.js"></script>
```

To:
```html
  <script src="popular.js"></script>
  <script src="app.js"></script>
```

`popular.js` must load before `app.js` so `showPopular` is defined when the router calls it.

- [ ] **Step 4: Commit**

```bash
git add public/index.html && git commit -m "feat: add Popular nav button and section HTML"
```

---

## Task 14: public/app.js — Router Wiring

**Files:**
- Modify: `public/app.js`

Navigation is handled by `setupNav()` (around line 469), which uses a single `querySelectorAll('.nav-btn')` loop with an `if/else if` chain on `btn.dataset.page`. There are no individual click handlers for `navRankings` or `navSearch` — everything goes through this one function. Add the `popular` branch here.

- [ ] **Step 1: Add `popular` branch to `setupNav()`**

Find `setupNav()`. Its structure is:

```js
  function setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (page === 'search') {
          ...
        } else if (page === 'rankings') {
          ...
        }
      });
    });
  }
```

Add a new `else if` after the `rankings` branch, and also add the Popular section hide to both existing branches:

```js
  function setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (page === 'search') {
          searchSection.style.display = '';
          resultsSection.style.display = allResults.length > 0 ? 'block' : 'none';
          rankingsSection.style.display = 'none';
          document.getElementById('popularSection').style.display = 'none';
          if (rankingEventSource) { rankingEventSource.close(); rankingEventSource = null; }
        } else if (page === 'rankings') {
          searchSection.style.display = 'none';
          resultsSection.style.display = 'none';
          rankingsSection.style.display = 'block';
          document.getElementById('popularSection').style.display = 'none';
          loadRankingTypes();
        } else if (page === 'popular') {
          searchSection.style.display = 'none';
          resultsSection.style.display = 'none';
          rankingsSection.style.display = 'none';
          showPopular(null);
        }
      });
    });
  }
```

Replace the entire `setupNav()` function body with the above.

- [ ] **Step 2: Commit**

```bash
git add public/app.js && git commit -m "feat: wire Popular tab into app.js setupNav()"
```

---

## Task 15: public/style.css — Popular Tab Styles

**Files:**
- Modify: `public/style.css`

- [ ] **Step 1: Append to end of style.css**

```css
/* ===== Popular Tab ===== */
.popular-section {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.popular-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1.25rem 0 0.5rem;
}

.popular-pill {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  padding: 0.35rem 0.9rem;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.popular-pill:hover {
  border-color: #3b82f6;
  color: #e2e8f0;
}

.popular-pill.active {
  background: #1e3a5f;
  border-color: #3b82f6;
  color: #60a5fa;
}

.popular-meta {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0.75rem 0 0;
  min-height: 1.5rem;
}

.popular-refresh-btn {
  background: none;
  border: 1px solid #334155;
  color: #94a3b8;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.78rem;
}

.popular-refresh-btn:hover {
  border-color: #3b82f6;
  color: #60a5fa;
}

.rank-num {
  color: #3b82f6;
  font-weight: 700;
  font-size: 0.85rem;
  text-align: center;
  width: 3rem;
}

.torrent-name {
  max-width: 500px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 2: Commit**

```bash
git add public/style.css && git commit -m "feat: add Popular tab CSS styles"
```

---

## Task 16: End-to-End Verification

- [ ] **Step 1: Start the server**

```bash
node server.js
```

Open `http://localhost:7777` in the browser.

- [ ] **Step 2: Verify nav tab appears**

Confirm the header shows three nav buttons: Search, Popular, Rankings.

- [ ] **Step 3: Open Popular tab — All category**

- Click Popular button
- Spinner appears while first load fetches (~10-20s)
- Ranked table loads with numbered rows 1-100 (or fewer)
- Seeds column is green, Leechers amber
- Combined column shows sum
- Source badges with icons visible

- [ ] **Step 4: Switch categories**

- Click Movies pill: table updates with movies
- Click Anime pill: results from Nyaa
- Click Balkan pill: "No popularity data available" message shown
- Click Balkan-Cartoons: same message

- [ ] **Step 5: Test refresh button**

- Click Refresh
- "Loading" state appears briefly
- Table reloads

- [ ] **Step 6: Verify no regressions**

- Click Search tab: search input works, search works
- Click Rankings: rankings load
- Popular section hides when switching tabs

- [ ] **Step 7: Final commit**

```bash
git add -A && git commit -m "feat: Popular tab complete - top 100 per category from multiple sites"
```

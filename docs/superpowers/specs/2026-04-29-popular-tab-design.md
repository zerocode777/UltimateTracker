# Popular Tab — Design Spec

**Date:** 2026-04-29  
**Status:** Approved

---

## Summary

Add a dedicated **Popular** tab to UltimateTracker that shows the top 100 most popular torrents per category, aggregated from multiple torrent sites and ranked by seeds + leechers. Results are cached server-side and refreshed every 6 hours.

---

## User Requirements

- New "Popular" tab in the main nav (alongside Search and Rankings)
- All 12 existing categories supported: All, Movies, TV, Anime, Cartoons, Ebooks, Audiobooks, Software, Games, Music, Balkan, Balkan-Cartoons
- Top 100 torrents per category, ranked by combined seeds + leechers descending
- When the same torrent appears on multiple sites, keep the single entry with the highest seed+leech count (no summing)
- Server-side cache, refreshed every 6 hours
- Manual refresh button on the page
- Same ranked table UI style as the existing Search results

---

## Data Sources

Each category uses only sites that expose native top-list or browse-by-seeders endpoints. Sites that require a search query are skipped.

| Category | Sources |
|---|---|
| All | TPB (top100 all), 1337x (/top-100), TorrentGalaxy, SolidTorrents |
| Movies | TPB (top100 video), 1337x (/top-100-movies), YTS (list sorted by seeds), TorrentGalaxy, LimeTorrents |
| TV | TPB (top100 video), 1337x (/top-100-tv), EZTV (browse), TorrentGalaxy, LimeTorrents |
| Music | TPB (top100 audio), 1337x (/top-100-music), TorrentGalaxy, LimeTorrents |
| Games | TPB (top100 games), 1337x (/top-100-games), TorrentGalaxy, SolidTorrents |
| Software | TPB (top100 apps), 1337x (/top-100-apps), TorrentGalaxy, SolidTorrents |
| Anime | Nyaa (browse, sort=seeders), AniDex (browse, sort=seeders) |
| Ebooks | TPB (top100 other), 1337x (/top-100-other) |
| Audiobooks | AudioBookBay (browse), TPB (audio cat) |
| Cartoons | TPB (top100 video), 1337x (`/top-100` filtered to Animation category), TorrentGalaxy (cat=15 Animation browse) |
| Balkan | None — BalkanDownload and CroTorrents are search-only and return zero seeds/leechers; Popular tab shows "No popularity data available for this category" |
| Balkan-Cartoons | None — same reason as Balkan |

---

## Backend Architecture

### New Files

| File | Responsibility |
|---|---|
| `scrapers/popular.js` | Orchestrator — calls site scrapers per category, deduplicates, manages cache |
| `scrapers/popular-tpb.js` | TPB `apibay.org/precompiled/data_top100_<cat>.json` |
| `scrapers/popular-1337x.js` | 1337x `/top-100-*` HTML pages |
| `scrapers/popular-yts.js` | YTS list API sorted by seeds |
| `scrapers/popular-eztv.js` | EZTV browse |
| `scrapers/popular-nyaa.js` | Nyaa browse sorted by seeders |
| `scrapers/popular-tgx.js` | TorrentGalaxy browse by category |
| `scrapers/popular-lime.js` | LimeTorrents top lists |
| `scrapers/popular-solid.js` | SolidTorrents browse sorted by seeds |
| `scrapers/popular-abb.js` | AudioBookBay browse |

### Cache Structure

The cache object lives in `scrapers/popular.js` (the orchestrator) and is exported. `server.js` imports the orchestrator's `getPopular(category)` and `refreshPopular(category)` functions — it never touches the cache directly.

```js
// In scrapers/popular.js
const popularCache = {
  movies: { data: [...], fetchedAt: Date, status: 'fresh' | 'fetching' | 'error' },
  tv:     { data: [...], fetchedAt: Date, status: 'fresh' | 'fetching' | 'error' },
  // ... one entry per category
}
```

### API Endpoints

| Method | Path | Behavior |
|---|---|---|
| `GET` | `/api/popular/:category` | Always returns JSON. Returns cached data immediately if < 6h old; returns stale data + triggers background refresh if ≥ 6h old; fetches synchronously (blocking, may take 10–20s) if cache is missing |
| `POST` | `/api/popular/:category/refresh` | Force-refresh that category's cache — **blocks until complete** (may take 10–20s); returns `{ status: 'ok' }` when done |

**Cache behavior on GET (always JSON):**

- Cache fresh (< 6h): respond immediately with `{ data: [...], fetchedAt, status: 'fresh' }`
- Cache stale (≥ 6h): respond immediately with stale data + `{ status: 'stale' }`, kick off background refresh
- Cache missing: fetch synchronously (blocking), respond with fresh data once complete; client shows a spinner for the duration

**Background timer:** `setInterval` every 6 hours refreshes all categories sequentially. Each category fetch has a 30-second timeout to prevent a hung scraper from blocking the cycle.

### Deduplication Algorithm

1. Collect all results from all sources for a category
2. Attempt to match duplicates by infohash extracted from magnet link (most accurate)
3. Fallback: normalized name match — lowercase, strip common quality/format tokens (`1080p`, `2160p`, `BluRay`, `WEB-DL`, `x264`, `x265`, `HEVC`, year patterns like `(2024)`)
4. For each duplicate group, keep the single entry with the highest `seeds + leechers`
5. Sort entire deduplicated list by `seeds + leechers` descending
6. Return top 100

---

## Frontend

### Modified Files

**`public/index.html`**
- Add `🔥 Popular` tab to main nav header, between Search and Rankings

**`public/popular.js`** (new file — extracted from app.js to stay within 300-line limit)

- All Popular tab logic lives here; loaded via `<script>` tag in index.html

**`public/app.js`**

- Add `popular` route to the hash-based SPA router (`#popular`) — delegates immediately to `showPopular()` defined in `popular.js`
- No Popular tab logic lives in `app.js` itself

**`public/popular.js`** contains:

- `showPopular(category)` — entry point called by `app.js` router
  - Fetches `GET /api/popular/:category` (standard JSON fetch, no SSE)
  - Renders ranked table
  - Shows spinner while waiting on first load (cache-miss fetch may take 10–20s)
  - Shows "Last refreshed X ago" and 🔄 Refresh button
  - If response has `status: 'stale'`, shows "Refreshing in background…" indicator
- Default category when tab opens: **All**
- Refresh button calls `POST /api/popular/:category/refresh` (blocking) then re-fetches

**`public/style.css`**
- Add `.popular-meta` — small text row for "Last refreshed X ago · 🔄 Refresh"
- All other styles reuse existing table and badge classes

### Table Columns

| Column | Notes |
|---|---|
| `#` | Rank 1–100 |
| `Name` | Torrent name |
| `Seeds` | Seeder count, green |
| `Leechers` | Leecher count, amber |
| `Combined` | Seeds + leechers — primary sort key |
| `Source` | Site badge with icon (same as Search) |
| `Actions` | Magnet link button if available |

### Category Pills

Displayed below the tab header, one pill per category. Active pill highlighted in blue. Clicking switches the displayed list without a page reload.

---

## Error Handling

- If a scraper fails for a category, its results are omitted silently (same pattern as Search)
- If all scrapers fail for a category, show an "Unable to load popular torrents — try refreshing" message
- Stale cache (returned while background refresh is in progress) shows a subtle "Refreshing..." indicator

---

## File Size Constraints

All new files must stay under 200 lines. The orchestrator `popular.js` handles cache management and deduplication; individual scraper files are fetch-only and should each be 80–120 lines.

---

## Out of Scope

- Persistence across server restarts (cache is in-memory only)
- Per-user cache or personalization
- Trending / delta tracking (no "rising" indicator)
- Pagination beyond top 100

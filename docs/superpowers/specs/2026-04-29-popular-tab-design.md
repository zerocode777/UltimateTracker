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
| Cartoons | TPB, 1337x, TorrentGalaxy |
| Balkan | BalkanDownload (browse), CroTorrents (browse) |
| Balkan-Cartoons | BalkanDownload (crtani filter), CroTorrents (crtani filter) |

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

```js
// In-memory, lives in server.js
const popularCache = {
  movies: { data: [...], fetchedAt: Date, status: 'fresh' | 'fetching' | 'error' },
  tv:     { data: [...], fetchedAt: Date, status: 'fresh' | 'fetching' | 'error' },
  // ... one entry per category
}
```

### API Endpoints

| Method | Path | Behavior |
|---|---|---|
| `GET` | `/api/popular/:category` | Returns cached data if < 6h old; triggers background refresh if stale; first-load fetches synchronously via SSE |
| `POST` | `/api/popular/:category/refresh` | Force-refresh that category's cache immediately |

**Cache behavior on GET:**
- Cache fresh (< 6h): return JSON immediately
- Cache stale (≥ 6h): return stale data + trigger background refresh
- Cache missing: fetch synchronously, stream progress via SSE (same pattern as Search)

**Background timer:** `setInterval` every 6 hours refreshes all categories sequentially.

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

**`public/app.js`**
- Add `popular` route to the hash-based SPA router (`#popular`)
- Add `showPopular(category)` function
  - Fetches `GET /api/popular/:category`
  - Renders ranked table
  - Shows spinner/skeleton on first load (SSE progress)
  - Shows "Last refreshed X ago" and 🔄 Refresh button
- Default category when tab opens: **All**
- Refresh button calls `POST /api/popular/:category/refresh` then re-fetches

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

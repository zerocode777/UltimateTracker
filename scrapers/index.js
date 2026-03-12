const PirateBayScraper = require('./piratebay');
const X1337Scraper = require('./x1337');
const YTSScraper = require('./yts');
const EZTVScraper = require('./eztv');
const NyaaScraper = require('./nyaa');
const TorrentGalaxyScraper = require('./torrentgalaxy');
const LimeTorrentsScraper = require('./limetorrents');
const SolidTorrentsScraper = require('./solidtorrents');
const LibGenScraper = require('./libgen');
const KickassScraper = require('./kickass');
const GloDLSScraper = require('./glodls');
const TorrentDownloadsScraper = require('./torrentdownloads');
const AniDexScraper = require('./anidex');
const BTDigScraper = require('./btdig');
const BalkanScraper = require('./balkan');
const BalkanDownloadScraper = require('./balkandownload');
const CroTorrentsScraper = require('./crotorrents');

// Instantiate all scrapers
const scrapers = {
  piratebay: new PirateBayScraper(),
  x1337: new X1337Scraper(),
  yts: new YTSScraper(),
  eztv: new EZTVScraper(),
  nyaa: new NyaaScraper(),
  torrentgalaxy: new TorrentGalaxyScraper(),
  limetorrents: new LimeTorrentsScraper(),
  solidtorrents: new SolidTorrentsScraper(),
  libgen: new LibGenScraper(),
  kickass: new KickassScraper(),
  glodls: new GloDLSScraper(),
  torrentdownloads: new TorrentDownloadsScraper(),
  anidex: new AniDexScraper(),
  btdig: new BTDigScraper(),
  balkan: new BalkanScraper(),
  balkandownload: new BalkanDownloadScraper(),
  crotorrents: new CroTorrentsScraper(),
};

// Category -> which scrapers to use
// Removed: solidtorrents (HTTP 521), btdig (HTTP 429), libgen (timeout on all domains)
const categoryMap = {
  all: ['piratebay', 'x1337', 'torrentgalaxy', 'limetorrents', 'kickass', 'glodls', 'torrentdownloads'],
  movies: ['piratebay', 'x1337', 'yts', 'torrentgalaxy', 'limetorrents', 'glodls'],
  tv: ['piratebay', 'x1337', 'eztv', 'torrentgalaxy', 'limetorrents'],
  anime: ['nyaa', 'anidex', 'piratebay', 'x1337', 'torrentgalaxy'],
  cartoons: ['piratebay', 'x1337', 'torrentgalaxy', 'limetorrents', 'kickass', 'balkan', 'balkandownload'],
  ebooks: ['piratebay'],  // Only TPB has ebook category (601). Others return general results.
  software: ['piratebay', 'x1337', 'torrentgalaxy', 'kickass', 'glodls', 'limetorrents'],
  games: ['piratebay', 'x1337', 'torrentgalaxy', 'kickass', 'glodls', 'limetorrents', 'crotorrents'],
  music: ['piratebay', 'x1337', 'torrentgalaxy', 'limetorrents', 'kickass'],
  balkan: ['balkan', 'balkandownload', 'piratebay', 'x1337', 'torrentgalaxy'],
  'balkan-cartoons': ['balkan', 'balkandownload'],
};

function getCategories() {
  return [
    { id: 'all', name: 'All', icon: '🌐' },
    { id: 'movies', name: 'Movies', icon: '🎬' },
    { id: 'tv', name: 'TV Shows', icon: '📺' },
    { id: 'anime', name: 'Anime', icon: '⛩️' },
    { id: 'cartoons', name: 'Cartoons', icon: '🎨' },
    { id: 'ebooks', name: 'eBooks', icon: '📚' },
    { id: 'software', name: 'Software', icon: '💻' },
    { id: 'games', name: 'Games', icon: '🎮' },
    { id: 'music', name: 'Music', icon: '🎵' },
    { id: 'balkan', name: 'Balkan', icon: '🇭🇷' },
    { id: 'balkan-cartoons', name: 'Balkan Cartoons', icon: '🇭🇷🎨' },
  ];
}

// Streaming search - emits events per source as they complete
async function searchStream(query, category = 'all', onEvent) {
  const scraperKeys = categoryMap[category] || categoryMap.all;

  let searchQuery = query;
  if (category === 'balkan-cartoons') {
    searchQuery = `${query} crtani`;
  }
  // Don't augment cartoon queries - let category filters handle it
  // Don't augment ebook queries either - TPB cat 601 handles it

  // Send initial event with source list
  const sourceList = scraperKeys.map(key => ({
    key,
    name: scrapers[key]?.name || key,
    status: 'searching',
  }));
  onEvent({ type: 'sources', sources: sourceList });

  console.log(`[Search] "${searchQuery}" in "${category}" using: ${scraperKeys.join(', ')}`);

  // Build relevance filter: all significant words (3+ chars) must appear in the name
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'is', 'it', 'by', 'with', 'from', 'as', 'not', 'but', 'are', 'was', 'has', 'had', 'do', 'does']);
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w));

  function isRelevant(name) {
    if (queryWords.length === 0) return true;
    const nameLower = name.toLowerCase().replace(/[.\-_]/g, ' ');
    return queryWords.every(word => nameLower.includes(word));
  }

  const promises = scraperKeys.map(async (key) => {
    const scraper = scrapers[key];
    if (!scraper) {
      onEvent({ type: 'source-done', key, name: key, status: 'error', error: 'Unknown scraper', results: [] });
      return;
    }
    try {
      const rawResults = await scraper.search(searchQuery, category);
      // Filter out irrelevant results that only match partial words
      const results = rawResults.filter(r => isRelevant(r.name));
      console.log(`  [${scraper.name}] ${results.length}/${rawResults.length} results (after relevance filter)`);
      onEvent({
        type: 'source-done',
        key,
        name: scraper.name,
        status: 'success',
        count: results.length,
        results,
      });
    } catch (err) {
      console.error(`  [${scraper.name}] Error: ${err.message}`);
      onEvent({
        type: 'source-done',
        key,
        name: scraper.name,
        status: 'error',
        error: err.message,
        results: [],
      });
    }
  });

  await Promise.allSettled(promises);
}

module.exports = { searchStream, getCategories };

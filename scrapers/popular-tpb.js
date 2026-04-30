const BaseScraper = require('./base');

class PopularTPB extends BaseScraper {
  constructor() {
    super('TPB', 'https://apibay.org');
  }

  // Category names for TPB precompiled data endpoint
  static CAT_MAP = {
    all: 'all',
    movies: 'video',
    tv: 'video',
    music: 'audio',
    games: 'games',
    software: 'apps',
    ebooks: 'other',
    audiobooks: 'audio',
    cartoons: 'video',
    anime: null,
    balkan: null,
    'balkan-cartoons': null,
    'balkan-games': null,
  };

  getUrl(category) {
    const cat = PopularTPB.CAT_MAP[category];
    if (!cat) return null;
    return `${this.baseUrl}/precompiled/data_top100_${cat}.json`;
  }

  async fetch(category) {
    const url = this.getUrl(category);
    if (!url) return [];

    try {
      const data = await this.fetchJSON(url);
      if (!Array.isArray(data)) return [];

      return data
        .filter(item => {
          const seeders = parseInt(item.seeders) || 0;
          const leechers = parseInt(item.leechers) || 0;
          // Skip dead torrents (no seeders and no leechers)
          return seeders > 0 || leechers > 0;
        })
        .map(item => ({
          name: item.name,
          size: this.formatSize(parseInt(item.size)),
          sizeBytes: parseInt(item.size) || 0,
          seeds: parseInt(item.seeders) || 0,
          leechers: parseInt(item.leechers) || 0,
          source: 'TPB',
          sourceUrl: `https://thepiratebay.org/description.php?id=${item.id}`,
          magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337`,
          date: item.added ? new Date(parseInt(item.added) * 1000).toISOString().split('T')[0] : 'N/A',
          category,
        }));
    } catch (err) {
      console.error(`PopularTPB.fetch(${category}) error:`, err.message);
      return [];
    }
  }
}

module.exports = new PopularTPB();

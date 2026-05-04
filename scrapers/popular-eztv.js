const BaseScraper = require('./base');

class PopularEZTV extends BaseScraper {
  constructor() {
    super('EZTV', 'https://eztv.re');
  }

  async fetch(category) {
    // Only serve TV category
    if (category !== 'tv') {
      return [];
    }

    try {
      const url = 'https://eztv.re/api/get-torrents?limit=100&page=1';
      const data = await this.fetchJSON(url);

      if (!data.torrents || !Array.isArray(data.torrents)) {
        return [];
      }

      const results = data.torrents
        .map((torrent) => {
          const sizeBytes = torrent.size_bytes || 0;
          return {
            name: torrent.filename || torrent.title || '',
            size: sizeBytes > 0 ? this.formatSize(sizeBytes) : '',
            sizeBytes,
            seeds: parseInt(torrent.seeds, 10) || 0,
            leechers: parseInt(torrent.peers, 10) || 0,
            source: 'EZTV',
            sourceUrl: torrent.episode_url || `https://eztv.re/ep/${torrent.id}/`,
            magnet: torrent.magnet_url || null,
            date: torrent.date_released_unix
              ? new Date(torrent.date_released_unix * 1000).toISOString().split('T')[0]
              : null,
            category: 'tv',
          };
        })
        // Filter out torrents with no seeds and no leechers
        .filter((result) => !(result.seeds === 0 && result.leechers === 0))
        // Sort by seeds descending
        .sort((a, b) => b.seeds - a.seeds)
        // Return top 100
        .slice(0, 100);

      return results;
    } catch (err) {
      console.error('PopularEZTV scraper error:', err.message);
      return [];
    }
  }
}

module.exports = new PopularEZTV();

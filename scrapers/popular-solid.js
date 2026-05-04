const BaseScraper = require('./base');

class PopularSolid extends BaseScraper {
  constructor() {
    super('SolidTorrents', 'https://solidtorrents.to');
  }

  async fetch(category) {
    try {
      // Map category to SolidTorrents API parameter
      let url = `${this.baseUrl}/api/v1/search?sort=seeders&fuzdis=true&limit=100&skip=0`;

      if (category === 'games') {
        url += '&category=Games';
      } else if (category === 'software') {
        url += '&category=Software';
      } else if (category !== 'all') {
        // Unsupported category
        return [];
      }

      const data = await this.fetchJSON(url);

      if (!data || !data.results) return [];

      // Map and filter results
      const results = data.results
        .filter(item => {
          const seeds = item.swarm?.seeders || 0;
          const leechers = item.swarm?.leechers || 0;
          return !(seeds === 0 && leechers === 0);
        })
        .map(item => ({
          name: item.title || 'N/A',
          size: this.formatSize(item.size || 0),
          sizeBytes: item.size || 0,
          seeds: item.swarm?.seeders || 0,
          leechers: item.swarm?.leechers || 0,
          source: 'SolidTorrents',
          sourceUrl: item.links?.[0] || `${this.baseUrl}/view/${item._id}`,
          magnet: item.magnet || null,
          date: null,
          category: category,
        }))
        .sort((a, b) => b.seeds - a.seeds)
        .slice(0, 100);

      return results;
    } catch (err) {
      return [];
    }
  }
}

module.exports = new PopularSolid();

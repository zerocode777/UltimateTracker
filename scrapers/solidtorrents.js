const BaseScraper = require('./base');

class SolidTorrentsScraper extends BaseScraper {
  constructor() {
    super('SolidTorrents', 'https://solidtorrents.to');
  }

  async search(query) {
    const url = `${this.baseUrl}/api/v1/search?q=${encodeURIComponent(query)}&sort=seeders`;
    const data = await this.fetchJSON(url);

    if (!data || !data.results) return [];

    return data.results.slice(0, 30).map(item => ({
      name: item.title || 'N/A',
      size: this.formatSize(item.size),
      sizeBytes: item.size || 0,
      seeds: item.swarm?.seeders || 0,
      leechers: item.swarm?.leechers || 0,
      source: this.name,
      sourceUrl: `${this.baseUrl}/view/${item._id}`,
      magnet: item.magnet || null,
      date: item.imported ? new Date(item.imported).toISOString().split('T')[0] : 'N/A',
      category: item.category || 'General',
    }));
  }
}

module.exports = SolidTorrentsScraper;

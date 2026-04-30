const BaseScraper = require('./base');

class Popular1337x extends BaseScraper {
  constructor() {
    super('1337x', 'https://1337x.to');
  }

  static CAT_URL = {
    all: '/top-100',
    movies: '/top-100-movies',
    tv: '/top-100-tv',
    music: '/top-100-music',
    games: '/top-100-games',
    software: '/top-100-apps',
    ebooks: '/top-100-other',
    audiobooks: null,
    anime: null,
    cartoons: '/top-100',
    balkan: null,
    'balkan-cartoons': null,
  };

  async fetch(category) {
    try {
      const path = Popular1337x.CAT_URL[category];
      if (!path) return [];

      const url = `${this.baseUrl}${path}`;
      const html = await this.fetchPage(url);
      const $ = this.parseHTML(html);
      const results = [];
      const rows = $('table.table-list tbody tr');

      rows.each((i, row) => {
        const nameLink = $(row).find('td.name a:nth-child(2)');
        const name = nameLink.text().trim();
        const detailPath = nameLink.attr('href');
        const seeds = parseInt($(row).find('td.seeds').text().trim()) || 0;
        const leechers = parseInt($(row).find('td.leeches').text().trim()) || 0;
        const size = $(row).find('td.size').clone().children().remove().end().text().trim();

        // Skip rows with no seeds AND no leechers
        if (seeds === 0 && leechers === 0) return;

        if (name && detailPath) {
          results.push({
            name,
            size: size || 'N/A',
            sizeBytes: this.parseSizeToBytes(size),
            seeds,
            leechers,
            source: this.name,
            sourceUrl: `${this.baseUrl}${detailPath}`,
            magnet: null,
            date: null,
            category: category || 'General',
          });
        }
      });

      return results;
    } catch (err) {
      console.error(`[Popular1337x] Error fetching ${category}:`, err.message);
      return [];
    }
  }

  parseSizeToBytes(sizeStr) {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|TB)/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers = { KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
    return Math.round(num * (multipliers[unit] || 1));
  }
}

module.exports = new Popular1337x();

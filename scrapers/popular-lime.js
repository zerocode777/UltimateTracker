const BaseScraper = require('./base');

class PopularLime extends BaseScraper {
  constructor() {
    super('LimeTorrents', 'https://www.limetorrents.lol');
    this.categoryMap = {
      movies: 'Movies',
      tv: 'TV-shows',
      music: 'Music',
    };
  }

  async fetch(category) {
    try {
      if (!this.categoryMap[category]) {
        return [];
      }

      const categoryPath = this.categoryMap[category];
      const url = `${this.baseUrl}/browse-torrents/${categoryPath}/seeds/1/`;
      const html = await this.fetchPage(url);
      const $ = this.parseHTML(html);
      const results = [];

      $('table.table2 tr').each((i, row) => {
        if (i === 0) return; // skip header
        if (i > 30) return false;
        const cols = $(row).find('td');
        if (cols.length < 5) return;

        const nameLink = cols.eq(0).find('a').first();
        const name = nameLink.text().trim();
        const href = nameLink.attr('href');
        const date = cols.eq(1).text().trim();
        const size = cols.eq(2).text().trim();
        const seeds = parseInt(cols.eq(3).text().trim().replace(/,/g, '')) || 0;
        const leechers = parseInt(cols.eq(4).text().trim().replace(/,/g, '')) || 0;

        // Filter: skip if seeds === 0 AND leechers === 0
        if (seeds === 0 && leechers === 0) return;

        if (name && href) {
          results.push({
            name,
            size: size || 'N/A',
            sizeBytes: this.parseSizeToBytes(size),
            seeds,
            leechers,
            source: 'LimeTorrents',
            sourceUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
            magnet: null,
            date: date || null,
            category,
          });
        }
      });

      // Sort by seeds descending
      results.sort((a, b) => b.seeds - a.seeds);

      return results;
    } catch (err) {
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

module.exports = new PopularLime();

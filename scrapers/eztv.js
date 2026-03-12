const BaseScraper = require('./base');

class EZTVScraper extends BaseScraper {
  constructor() {
    super('EZTV', 'https://eztvx.to');
  }

  async search(query) {
    // EZTV search page scraping
    const url = `${this.baseUrl}/search/${encodeURIComponent(query)}`;
    const html = await this.fetchPage(url);
    const $ = this.parseHTML(html);
    const results = [];

    $('table.forum_header_border tr.forum_header_border').each((i, row) => {
      if (i >= 30) return false;
      const nameLink = $(row).find('td').eq(1).find('a').first();
      const name = nameLink.text().trim();
      const href = nameLink.attr('href');
      const magnetLink = $(row).find('a.magnet[href^="magnet:"]').attr('href') ||
                          $(row).find('a[href^="magnet:"]').attr('href');
      const size = $(row).find('td').eq(3).text().trim();
      const seeds = parseInt($(row).find('td').last().prev().text().trim()) || 0;
      const date = $(row).find('td').eq(4).text().trim();

      if (name) {
        results.push({
          name,
          size: size || 'N/A',
          sizeBytes: this.parseSizeToBytes(size),
          seeds,
          leechers: 0,
          source: this.name,
          sourceUrl: href ? `${this.baseUrl}${href}` : this.baseUrl,
          magnet: magnetLink || null,
          date: date || 'N/A',
          category: 'TV Shows',
        });
      }
    });

    return results;
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

module.exports = EZTVScraper;

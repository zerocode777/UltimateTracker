const BaseScraper = require('./base');

class GloDLSScraper extends BaseScraper {
  constructor() {
    super('GloDLS', 'https://glodls.to');
  }

  async search(query) {
    const url = `${this.baseUrl}/search_results.php?search=${encodeURIComponent(query)}&cat=0&incldead=0&inclexternal=0&lang=0&sort=seeders&order=desc`;
    const html = await this.fetchPage(url);
    const $ = this.parseHTML(html);
    const results = [];

    $('table.ttable_headinner tr').each((i, row) => {
      if (i === 0) return;
      if (i > 25) return false;
      const cols = $(row).find('td');
      if (cols.length < 7) return;

      const nameLink = cols.eq(1).find('a').first();
      const name = nameLink.text().trim();
      const href = nameLink.attr('href');
      const size = cols.eq(4).text().trim();
      const seeds = parseInt(cols.eq(5).text().trim()) || 0;
      const leechers = parseInt(cols.eq(6).text().trim()) || 0;
      const magnetLink = $(row).find('a[href^="magnet:"]').attr('href');

      if (name) {
        results.push({
          name,
          size: size || 'N/A',
          sizeBytes: this.parseSizeToBytes(size),
          seeds,
          leechers,
          source: this.name,
          sourceUrl: href ? `${this.baseUrl}${href}` : this.baseUrl,
          magnet: magnetLink || null,
          date: 'N/A',
          category: 'General',
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

module.exports = GloDLSScraper;

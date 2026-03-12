const BaseScraper = require('./base');

class AniDexScraper extends BaseScraper {
  constructor() {
    super('AniDex', 'https://anidex.info');
  }

  async search(query) {
    const url = `${this.baseUrl}/?q=${encodeURIComponent(query)}&s=seeders&o=desc`;
    const html = await this.fetchPage(url);
    const $ = this.parseHTML(html);
    const results = [];

    $('div#content table tbody tr').each((i, row) => {
      if (i >= 25) return false;
      const cols = $(row).find('td');
      if (cols.length < 8) return;

      const nameLink = cols.eq(2).find('a').first();
      const name = nameLink.text().trim();
      const href = nameLink.attr('href');
      const magnetLink = cols.eq(4).find('a[href^="magnet:"]').attr('href');
      const size = cols.eq(6).text().trim();
      const seeds = parseInt(cols.eq(8).text().trim()) || 0;
      const leechers = parseInt(cols.eq(9).text().trim()) || 0;
      const date = cols.eq(7).text().trim();

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
          date: date || 'N/A',
          category: 'Anime',
        });
      }
    });

    return results;
  }

  parseSizeToBytes(sizeStr) {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|TB|KiB|MiB|GiB|TiB)/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase().replace('I', '');
    const multipliers = { KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
    return Math.round(num * (multipliers[unit] || 1));
  }
}

module.exports = AniDexScraper;

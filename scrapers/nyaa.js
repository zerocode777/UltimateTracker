const BaseScraper = require('./base');

class NyaaScraper extends BaseScraper {
  constructor() {
    super('Nyaa', 'https://nyaa.si');
  }

  async search(query) {
    const url = `${this.baseUrl}/?f=0&c=0_0&q=${encodeURIComponent(query)}&s=seeders&o=desc`;
    const html = await this.fetchPage(url);
    const $ = this.parseHTML(html);
    const results = [];

    $('table.torrent-list tbody tr').each((i, row) => {
      if (i >= 30) return false;
      const cols = $(row).find('td');
      const nameLink = cols.eq(1).find('a:not(.comments)').last();
      const name = nameLink.text().trim();
      const href = nameLink.attr('href');
      const magnetLink = cols.eq(2).find('a[href^="magnet:"]').attr('href');
      const size = cols.eq(3).text().trim();
      const date = cols.eq(4).text().trim();
      const seeds = parseInt(cols.eq(5).text().trim()) || 0;
      const leechers = parseInt(cols.eq(6).text().trim()) || 0;

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
    const match = sizeStr.match(/([\d.]+)\s*(KiB|MiB|GiB|TiB|KB|MB|GB|TB)/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase().replace('I', '');
    const multipliers = { KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
    return Math.round(num * (multipliers[unit] || 1));
  }
}

module.exports = NyaaScraper;

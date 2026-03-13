const BaseScraper = require('./base');

class BTDigScraper extends BaseScraper {
  constructor() {
    super('BTDig', 'https://btdig.com');
  }

  async search(query) {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&order=0`;
    const html = await this.fetchPage(url);
    const $ = this.parseHTML(html);
    const results = [];

    $('div.one_result').each((i, row) => {
      if (i >= 25) return false;
      const nameLink = $(row).find('div.torrent_name a').first();
      const name = nameLink.text().trim();
      const href = nameLink.attr('href');
      const magnetLink = $(row).find('a[href^="magnet:"]').attr('href');

      const statsText = $(row).find('div.torrent_stats').text();
      const sizeMatch = statsText.match(/([\d.]+\s*(?:KB|MB|GB|TB|KiB|MiB|GiB|TiB))/i);
      const size = sizeMatch ? sizeMatch[1] : 'N/A';

      const filesMatch = statsText.match(/(\d+)\s*files?/i);

      if (name) {
        results.push({
          name,
          size,
          sizeBytes: this.parseSizeToBytes(size),
          seeds: 0,
          leechers: 0,
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
    const match = sizeStr.match(/([\d.]+)\s*(KB|MB|GB|TB|KiB|MiB|GiB|TiB)/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase().replace('I', '');
    const multipliers = { KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
    return Math.round(num * (multipliers[unit] || 1));
  }
}

module.exports = BTDigScraper;

const BaseScraper = require('./base');

class TorrentGalaxyScraper extends BaseScraper {
  constructor() {
    super('TorrentGalaxy', 'https://torrentgalaxy.org');
  }

  async search(query) {
    const url = `${this.baseUrl}/torrents.php?search=${encodeURIComponent(query)}&sort=seeders&order=desc`;
    const html = await this.fetchPage(url);
    const $ = this.parseHTML(html);
    const results = [];

    $('div.tgxtablerow').each((i, row) => {
      if (i >= 30) return false;
      const nameLink = $(row).find('div.tgxtablecell a.txlight').first();
      if (!nameLink.length) return;
      const name = nameLink.text().trim();
      const href = nameLink.attr('href');
      const magnetLink = $(row).find('a[href^="magnet:"]').attr('href');

      const cells = $(row).find('div.tgxtablecell');
      const size = cells.eq(7).text().trim() || cells.find('span.badge').first().text().trim();
      const seedText = $(row).find('span[title="Seeders/Leechers"] font[color="green"], span.badge-active b, font[color="green"]').first().text().trim();
      const leechText = $(row).find('span[title="Seeders/Leechers"] font[color="#ff0000"], font[color="#ff0000"]').first().text().trim();
      const seeds = parseInt(seedText) || 0;
      const leechers = parseInt(leechText) || 0;
      const date = cells.eq(11).text().trim() || '';

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

module.exports = TorrentGalaxyScraper;

const BaseScraper = require('./base');

class PopularTGX extends BaseScraper {
  static CAT_ID = {
    all: null,
    movies: 3,
    tv: 41,
    music: 22,
    games: 10,
    software: 20,
    anime: 28,
    cartoons: 15,
  };

  constructor() {
    super('TorrentGalaxy', 'https://torrentgalaxy.org');
  }

  getUrl(category) {
    const catId = PopularTGX.CAT_ID[category];
    if (catId === undefined) return null; // unsupported category
    if (catId === null) {
      // all
      return `${this.baseUrl}/torrents.php?sort=seeders&order=desc`;
    }
    return `${this.baseUrl}/torrents.php?cat=${catId}&sort=seeders&order=desc`;
  }

  async fetch(category) {
    try {
      const url = this.getUrl(category);
      if (!url) return [];

      const html = await this.fetchPage(url);
      const $ = this.parseHTML(html);
      const results = [];

      $('div.tgxtablerow').each((i, row) => {
        if (i >= 30) return false;

        const nameLink = $(row).find('a.txlight').first();
        if (!nameLink.length) return;

        const name = nameLink.text().trim();
        const href = nameLink.attr('href');
        if (!name) return;

        // Extract torrent ID from href (e.g., /torrent/12345/slug)
        const magnetLink = $(row).find('a[href^="magnet:"]').attr('href');

        // Find size in cells
        const cells = $(row).find('div.tgxtablecell');
        let size = '';
        if (cells.length > 7) {
          size = cells.eq(7).text().trim();
        }
        if (!size) {
          size = cells.find('span.badge').first().text().trim();
        }

        // Find seeds
        const seedText = $(row).find('span[title="Seeders/Leechers"] font[color="green"], span.badge-active b, font[color="green"]').first().text().trim();
        const seeds = parseInt(seedText) || 0;

        // Find leechers
        const leechText = $(row).find('span[title="Seeders/Leechers"] font[color="#ff0000"], font[color="#ff0000"]').first().text().trim();
        const leechers = parseInt(leechText) || 0;

        // Skip if dead (0 seeds AND 0 leechers)
        if (seeds === 0 && leechers === 0) return;

        const sourceUrl = href ? `${this.baseUrl}${href}` : this.baseUrl;

        results.push({
          name,
          size: size || 'N/A',
          sizeBytes: this.parseSizeToBytes(size),
          seeds,
          leechers,
          source: 'TGx',
          sourceUrl,
          magnet: magnetLink || null,
          date: null,
          category,
        });
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

module.exports = new PopularTGX();

const BaseScraper = require('./base');

class PopularNyaa extends BaseScraper {
  constructor() {
    super('Nyaa', 'https://nyaa.si');
  }

  async fetch(category) {
    // Only serve anime category
    if (category !== 'anime') {
      return [];
    }

    try {
      const results = [];

      // Fetch both pages sorted by seeders descending
      for (let page = 1; page <= 2; page++) {
        const url = `${this.baseUrl}/?s=seeders&o=desc&p=${page}`;
        const html = await this.fetchPage(url);
        const $ = this.parseHTML(html);

        $('table.torrent-list tbody tr').each((i, row) => {
          const cols = $(row).find('td');
          const nameLink = cols.eq(1).find('a:not(.comments)').last();
          const name = nameLink.text().trim();
          const href = nameLink.attr('href');
          const magnetLink = cols.eq(2).find('a[href^="magnet:"]').attr('href');
          const size = cols.eq(3).text().trim();
          const date = cols.eq(4).text().trim();
          const seeds = parseInt(cols.eq(5).text().trim()) || 0;
          const leechers = parseInt(cols.eq(6).text().trim()) || 0;

          // Skip rows with zero seeds and zero leechers
          if (seeds === 0 && leechers === 0) {
            return;
          }

          if (name && href && magnetLink) {
            results.push({
              name,
              size: size || 'N/A',
              sizeBytes: this.parseSizeToBytes(size),
              seeds,
              leechers,
              source: 'Nyaa',
              sourceUrl: `${this.baseUrl}${href}`,
              magnet: magnetLink,
              date: date || 'N/A',
              category: 'anime',
            });
          }
        });
      }

      // Sort by seeds descending and take top 100
      results.sort((a, b) => b.seeds - a.seeds);
      return results.slice(0, 100);
    } catch (err) {
      console.error(`PopularNyaa fetch error: ${err.message}`);
      return [];
    }
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

module.exports = new PopularNyaa();

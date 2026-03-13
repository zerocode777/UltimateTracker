const BaseScraper = require('./base');

class LibGenScraper extends BaseScraper {
  constructor() {
    super('Library Genesis', 'https://libgen.is');
  }

  async search(query) {
    const url = `${this.baseUrl}/search.php?req=${encodeURIComponent(query)}&open=0&res=25&view=simple&phrase=1&column=def`;
    const html = await this.fetchPage(url);
    const $ = this.parseHTML(html);
    const results = [];

    $('table.c tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cols = $(row).find('td');
      if (cols.length < 10) return;

      const authors = cols.eq(1).text().trim();
      const titleLink = cols.eq(2).find('a').first();
      const title = titleLink.text().trim();
      const href = titleLink.attr('href');
      const publisher = cols.eq(3).text().trim();
      const year = cols.eq(4).text().trim();
      const size = cols.eq(7).text().trim();
      const ext = cols.eq(8).text().trim();

      if (title) {
        const displayName = authors ? `${title} - ${authors}` : title;
        results.push({
          name: `[${ext.toUpperCase()}] ${displayName}${year ? ` (${year})` : ''}`,
          size: size || 'N/A',
          sizeBytes: this.parseSizeToBytes(size),
          seeds: 0,
          leechers: 0,
          source: this.name,
          sourceUrl: href ? (href.startsWith('http') ? href : `${this.baseUrl}/${href}`) : this.baseUrl,
          magnet: null,
          date: year || 'N/A',
          category: 'eBooks',
        });
      }
    });

    return results;
  }

  parseSizeToBytes(sizeStr) {
    if (!sizeStr) return 0;
    const match = sizeStr.match(/([\d.]+)\s*(Kb|Mb|Gb|KB|MB|GB|TB)/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers = { KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
    return Math.round(num * (multipliers[unit] || 1));
  }
}

module.exports = LibGenScraper;

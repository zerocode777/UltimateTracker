const BaseScraper = require('./base');

class X1337Scraper extends BaseScraper {
  constructor() {
    super('1337x', 'https://www.1337xx.to');
  }

  // 1337x has category-specific search URLs
  static CAT_PATH = {
    movies: '/category-search/',
    tv: '/category-search/',
    anime: '/category-search/',
    cartoons: '/category-search/',
    music: '/category-search/',
    games: '/category-search/',
    software: '/category-search/',
  };

  static CAT_SUFFIX = {
    movies: '/Movies/1/',
    tv: '/TV/1/',
    anime: '/Anime/1/',
    cartoons: '/Anime/1/',
    music: '/Music/1/',
    games: '/Games/1/',
    software: '/Apps/1/',
  };

  async search(query, category = 'all') {
    let url;
    if (X1337Scraper.CAT_SUFFIX[category]) {
      url = `${this.baseUrl}/category-search/${encodeURIComponent(query)}${X1337Scraper.CAT_SUFFIX[category]}`;
    } else {
      url = `${this.baseUrl}/search/${encodeURIComponent(query)}/1/`;
    }

    const html = await this.fetchPage(url);
    const $ = this.parseHTML(html);
    const results = [];
    const rows = $('table.table-list tbody tr');

    rows.each((i, row) => {
      if (i >= 30) return false;
      const nameLink = $(row).find('td.name a:nth-child(2)');
      const name = nameLink.text().trim();
      const detailPath = nameLink.attr('href');
      const seeds = parseInt($(row).find('td.seeds').text().trim()) || 0;
      const leechers = parseInt($(row).find('td.leeches').text().trim()) || 0;
      const size = $(row).find('td.size').clone().children().remove().end().text().trim();
      const date = $(row).find('td.coll-date').text().trim();

      if (name && detailPath) {
        results.push({
          name,
          size: size || 'N/A',
          sizeBytes: this.parseSizeToBytes(size),
          seeds,
          leechers,
          source: this.name,
          sourceUrl: `${this.baseUrl}${detailPath}`,
          magnet: null,
          date: date || 'N/A',
          category: category || 'General',
          _detailPath: detailPath,
        });
      }
    });

    // Fetch magnets for top 10 results in parallel
    const magnetPromises = results.slice(0, 10).map(async (r) => {
      try {
        const detailHtml = await this.fetchPage(`${this.baseUrl}${r._detailPath}`);
        const $d = this.parseHTML(detailHtml);
        r.magnet = $d('a[href^="magnet:"]').first().attr('href') || null;
      } catch (e) {
        // ignore - magnet will be null
      }
    });
    await Promise.allSettled(magnetPromises);

    return results.map(r => {
      delete r._detailPath;
      return r;
    });
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

module.exports = X1337Scraper;

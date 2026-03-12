const BaseScraper = require('./base');

class TorrentDownloadsScraper extends BaseScraper {
  constructor() {
    super('TorrentDownloads', 'https://www.torrentdownloads.pro');
  }

  async search(query) {
    const url = `${this.baseUrl}/search/?search=${encodeURIComponent(query)}`;
    const html = await this.fetchPage(url);
    const $ = this.parseHTML(html);
    const results = [];

    // Results are in the second .inner_container, each row is a div.grey_bar3
    const container = $('.inner_container').eq(1);
    container.find('div.grey_bar3').each((i, row) => {
      // Skip header row
      const firstP = $(row).find('p b');
      if (firstP.length > 0 && firstP.text().trim() === 'Torrent name') return;

      if (results.length >= 25) return false;

      const nameLink = $(row).find('p a').first();
      const name = nameLink.text().trim().replace(/^-\s+/, '');
      const href = nameLink.attr('href');

      // Spans order: health, leech, seeds, size
      const spans = $(row).find('span').not('.health, .check_box, .provider');
      const leechers = parseInt(spans.eq(0).text().trim()) || 0;
      const seeds = parseInt(spans.eq(1).text().trim()) || 0;
      const sizeText = spans.eq(2).text().trim().replace(/\u00a0/g, ' ');

      // Skip external redirect links and empty names
      if (!name || name.length < 3) return;
      if (href && href.startsWith('http') && !href.includes('torrentdownloads')) return;

      results.push({
        name,
        size: sizeText || 'N/A',
        sizeBytes: this.parseSizeToBytes(sizeText),
        seeds,
        leechers,
        source: this.name,
        sourceUrl: href ? (href.startsWith('http') ? href : `${this.baseUrl}${href}`) : this.baseUrl,
        magnet: null,
        date: 'N/A',
        category: 'General',
      });
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

module.exports = TorrentDownloadsScraper;

const BaseScraper = require('./base');

// CroTorrents.com - public, WordPress-based, primarily PC games
class CroTorrentsScraper extends BaseScraper {
  constructor() {
    super('CroTorrents', 'https://crotorrents.com');
  }

  async search(query) {
    const url = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
    const html = await this.fetchPage(url);
    const $ = this.parseHTML(html);
    const results = [];

    // WordPress search results
    $('article, div.post, div.entry, .search-result, .type-post').each((i, item) => {
      if (i >= 20) return false;

      const titleLink = $(item).find('h2 a, h3 a, .entry-title a, a.post-title').first();
      let title = titleLink.text().trim();
      const href = titleLink.attr('href');
      if (!title || !href) return;

      // Get excerpt/description
      const excerpt = $(item).find('.entry-content, .entry-summary, .post-excerpt, p').first().text().trim();
      const date = $(item).find('time, .post-date, .entry-date').first().text().trim() ||
                   $(item).find('time').attr('datetime')?.split('T')[0] || 'N/A';

      // WordPress game sites often have category info
      const cats = [];
      $(item).find('.cat-links a, .post-categories a, a[rel="category tag"]').each((j, el) => {
        cats.push($(el).text().trim());
      });
      const category = cats.length > 0 ? cats.join(', ') : 'Games';

      results.push({
        name: `[CRO] ${title}`,
        size: 'N/A',
        sizeBytes: 0,
        seeds: 0,
        leechers: 0,
        source: this.name,
        sourceUrl: href,
        magnet: null,
        date,
        category,
        _detailUrl: href,
      });
    });

    // Fetch detail pages for magnet/torrent links
    const detailPromises = results.slice(0, 8).map(async (r) => {
      try {
        const detailHtml = await this.fetchPage(r._detailUrl);
        const $d = this.parseHTML(detailHtml);

        // Look for magnet links
        const magnet = $d('a[href^="magnet:"]').first().attr('href');
        if (magnet) r.magnet = magnet;

        // Look for torrent download links
        if (!r.magnet) {
          const torrentLink = $d('a[href*=".torrent"]').first().attr('href');
          if (torrentLink) {
            r.magnet = null; // no magnet, user will use source link
          }
        }

        // Try to find size
        const pageText = $d('.entry-content, .post-content, article').text();
        const sizeMatch = pageText.match(/size[:\s]*([\d.,]+)\s*(KB|MB|GB|TB)/i) ||
                          pageText.match(/([\d.,]+)\s*(GB|TB)/i);
        if (sizeMatch) {
          r.size = `${sizeMatch[1]} ${sizeMatch[2]}`;
          r.sizeBytes = this.parseSizeToBytes(r.size);
        }
      } catch (e) {}
    });
    await Promise.allSettled(detailPromises);

    return results.map(r => { delete r._detailUrl; return r; });
  }

  parseSizeToBytes(sizeStr) {
    if (!sizeStr || sizeStr === 'N/A') return 0;
    const match = sizeStr.match(/([\d.,]+)\s*(KB|MB|GB|TB)/i);
    if (!match) return 0;
    const num = parseFloat(match[1].replace(',', '.'));
    const unit = match[2].toUpperCase();
    const multipliers = { KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 };
    return Math.round(num * (multipliers[unit] || 1));
  }
}

module.exports = CroTorrentsScraper;

const BaseScraper = require('./base');

// BalkanDownload.org - IPS Community forum, publicly browsable
// Specializes in Balkan films, series, music, ebooks
class BalkanDownloadScraper extends BaseScraper {
  constructor() {
    super('BalkanDownload', 'https://www.balkandownload.org');
  }

  async search(query) {
    // IPS forum search
    const url = `${this.baseUrl}/search/?q=${encodeURIComponent(query)}&type=forums_topic&sortby=relevancy`;
    const html = await this.fetchPage(url);
    const $ = this.parseHTML(html);
    const results = [];

    // IPS search results
    $('li.ipsStreamItem, div.ipsStreamItem, ol.ipsStream li').each((i, item) => {
      if (i >= 25) return false;
      const titleLink = $(item).find('a.ipsStreamItem_title, h2 a, .ipsType_break a').first();
      const title = titleLink.text().trim();
      const href = titleLink.attr('href');

      if (!title || !href) return;

      // Try to extract info from the listing
      const snippet = $(item).find('.ipsStreamItem_snippet, .ipsType_richText, .ipsType_textBlock').text().trim();
      const dateEl = $(item).find('time').first();
      const date = dateEl.attr('datetime') ? dateEl.attr('datetime').split('T')[0] : 'N/A';
      const forum = $(item).find('.ipsStreamItem_status a, .ipsType_small a').first().text().trim();

      // Try to find size in snippet
      const sizeMatch = snippet.match(/([\d.,]+)\s*(KB|MB|GB|TB)/i);
      const size = sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : 'N/A';

      results.push({
        name: `[BALKAN] ${title}`,
        size,
        sizeBytes: this.parseSizeToBytes(size),
        seeds: 0,
        leechers: 0,
        source: this.name,
        sourceUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
        magnet: null,
        date,
        category: this.guessCategory(forum, title),
        _detailUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
      });
    });

    // Also try to parse table-style results if forum uses tables
    $('table.ipsTable tr, table.cDownloadsTable tr').each((i, row) => {
      if (i === 0) return; // header
      if (i >= 20) return false;
      const nameLink = $(row).find('a').first();
      const name = nameLink.text().trim();
      const href = nameLink.attr('href');
      if (!name || !href) return;

      const cols = $(row).find('td');
      const size = cols.length > 2 ? cols.eq(2).text().trim() : 'N/A';

      results.push({
        name: `[BALKAN] ${name}`,
        size,
        sizeBytes: this.parseSizeToBytes(size),
        seeds: 0,
        leechers: 0,
        source: this.name,
        sourceUrl: href.startsWith('http') ? href : `${this.baseUrl}${href}`,
        magnet: null,
        date: 'N/A',
        category: 'Balkan',
      });
    });

    // Fetch detail pages for magnet links on top results
    const needDetail = results.filter(r => r._detailUrl).slice(0, 5);
    const detailPromises = needDetail.map(async (r) => {
      try {
        const detailHtml = await this.fetchPage(r._detailUrl);
        const $d = this.parseHTML(detailHtml);
        // Look for magnet links or torrent download links
        const magnet = $d('a[href^="magnet:"]').first().attr('href');
        if (magnet) r.magnet = magnet;

        // Also try to find size info in detail page
        if (r.size === 'N/A') {
          const pageText = $d('body').text();
          const sMatch = pageText.match(/([\d.,]+)\s*(KB|MB|GB|TB)/i);
          if (sMatch) {
            r.size = `${sMatch[1]} ${sMatch[2]}`;
            r.sizeBytes = this.parseSizeToBytes(r.size);
          }
        }
      } catch (e) {}
    });
    await Promise.allSettled(detailPromises);

    return results.map(r => { delete r._detailUrl; return r; });
  }

  guessCategory(forum, title) {
    const lower = (forum + ' ' + title).toLowerCase();
    if (lower.includes('film') || lower.includes('movie')) return 'Movies';
    if (lower.includes('serij') || lower.includes('series')) return 'TV Shows';
    if (lower.includes('crtani') || lower.includes('animiran') || lower.includes('cartoon')) return 'Cartoons';
    if (lower.includes('muzik') || lower.includes('music')) return 'Music';
    if (lower.includes('knjig') || lower.includes('book') || lower.includes('ebook')) return 'eBooks';
    if (lower.includes('igr') || lower.includes('game')) return 'Games';
    return 'Balkan';
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

module.exports = BalkanDownloadScraper;

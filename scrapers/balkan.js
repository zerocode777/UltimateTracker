const BaseScraper = require('./base');

// Balkan torrent search - searches general sites with Balkan-specific keywords
// and filters results to only include actual Balkan content
class BalkanScraper extends BaseScraper {
  constructor() {
    super('Balkan Search', 'https://www.1337xx.to');
  }

  // Keywords that indicate actual Balkan content in torrent names
  static BALKAN_INDICATORS = [
    'hrvatski', 'croatian', 'cro', 'hrv', 'hr dub', 'hr sub',
    'sinkronizirano', 'sinkronizacija', 'sinkron',
    'srpski', 'serbian', 'srb',
    'bosanski', 'bosnian', 'bos',
    'balkan', 'ex-yu', 'exyu', 'yugo',
    'crtani', 'crtić', 'crtic',
    'hrvatski titl', 'titlovi', 'prijevod',
    'dubbed croatian', 'dubbed serbian',
    'hrv sync', 'cro sync', 'cro dub',
    'domaci', 'domaći',
  ];

  // Check if a torrent name contains Balkan-related keywords
  isBalkanContent(name) {
    const lower = name.toLowerCase();
    return BalkanScraper.BALKAN_INDICATORS.some(kw => lower.includes(kw));
  }

  getBalkanQueries(query) {
    return [
      `${query} hrvatski`,
      `${query} sinkronizirano`,
      `${query} croatian dub`,
      `${query} cro dub`,
      `${query} srpski`,
    ];
  }

  async search(query) {
    const balkanQueries = this.getBalkanQueries(query);
    const allResults = [];

    // Search 1337x with Balkan terms
    const searchPromises = balkanQueries.slice(0, 3).map(async (bq) => {
      try {
        const url = `${this.baseUrl}/search/${encodeURIComponent(bq)}/1/`;
        const html = await this.fetchPage(url);
        const $ = this.parseHTML(html);
        const results = [];

        $('table.table-list tbody tr').each((i, row) => {
          if (i >= 15) return false;
          const nameLink = $(row).find('td.name a:nth-child(2)');
          const name = nameLink.text().trim();
          const detailPath = nameLink.attr('href');
          const seeds = parseInt($(row).find('td.seeds').text().trim()) || 0;
          const leechers = parseInt($(row).find('td.leeches').text().trim()) || 0;
          const size = $(row).find('td.size').clone().children().remove().end().text().trim();

          // Only include if the name actually contains Balkan keywords
          if (name && detailPath && this.isBalkanContent(name)) {
            results.push({
              name: `[BALKAN] ${name}`,
              size: size || 'N/A',
              sizeBytes: this.parseSizeToBytes(size),
              seeds,
              leechers,
              source: 'Balkan (1337x)',
              sourceUrl: `${this.baseUrl}${detailPath}`,
              magnet: null,
              date: 'N/A',
              category: 'Balkan',
              _detailPath: detailPath,
            });
          }
        });

        return results;
      } catch (e) {
        return [];
      }
    });

    // Also search PirateBay with Balkan terms
    const tpbPromises = balkanQueries.slice(0, 2).map(async (bq) => {
      try {
        const url = `https://apibay.org/q.php?q=${encodeURIComponent(bq)}&cat=0`;
        const data = await this.fetchJSON(url);
        if (!Array.isArray(data) || (data.length === 1 && data[0].name === 'No results returned')) {
          return [];
        }
        // Only include results whose name actually contains Balkan keywords
        return data.slice(0, 15)
          .filter(item => this.isBalkanContent(item.name))
          .map(item => ({
            name: `[BALKAN] ${item.name}`,
            size: this.formatSize(parseInt(item.size)),
            sizeBytes: parseInt(item.size) || 0,
            seeds: parseInt(item.seeders) || 0,
            leechers: parseInt(item.leechers) || 0,
            source: 'Balkan (TPB)',
            sourceUrl: `https://thepiratebay.org/description.php?id=${item.id}`,
            magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337`,
            date: item.added ? new Date(parseInt(item.added) * 1000).toISOString().split('T')[0] : 'N/A',
            category: 'Balkan',
          }));
      } catch (e) {
        return [];
      }
    });

    const allPromises = [...searchPromises, ...tpbPromises];
    const settled = await Promise.allSettled(allPromises);

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      }
    }

    // Deduplicate by name similarity
    const seen = new Set();
    const deduped = allResults.filter(r => {
      const key = r.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Fetch magnets for top 1337x results
    const needMagnets = deduped.filter(r => !r.magnet && r._detailPath).slice(0, 5);
    const magnetPromises = needMagnets.map(async (r) => {
      try {
        const html = await this.fetchPage(`${this.baseUrl}${r._detailPath}`);
        const $ = this.parseHTML(html);
        r.magnet = $('a[href^="magnet:"]').first().attr('href') || null;
      } catch (e) {}
    });
    await Promise.allSettled(magnetPromises);

    return deduped.map(r => { delete r._detailPath; return r; });
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

module.exports = BalkanScraper;

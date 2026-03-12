const BaseScraper = require('./base');

class AudioBookBayScraper extends BaseScraper {
  constructor() {
    super('AudioBookBay', 'https://audiobookbay.lu');
  }

  async search(query) {
    const url = `${this.baseUrl}/?s=${encodeURIComponent(query)}&tt=1`;
    const html = await this.fetchPage(url);
    const $ = this.parseHTML(html);
    const results = [];
    const detailUrls = [];

    $('div.post').each((i, el) => {
      if (i >= 20) return false;
      const titleEl = $(el).find('div.postTitle h2 a');
      const name = titleEl.text().trim();
      const detailUrl = titleEl.attr('href');
      if (!name || !detailUrl) return;

      // Extract size from postContent
      const contentText = $(el).find('div.postContent').text();
      const sizeMatch = contentText.match(/File Size:\s*([\d.]+)\s*(\w+)/i);
      let size = 'N/A';
      let sizeBytes = 0;
      if (sizeMatch) {
        const num = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2].toUpperCase();
        size = `${num} ${unit}`;
        const multipliers = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
        sizeBytes = Math.round(num * (multipliers[unit] || 1));
      }

      // Extract format
      const formatMatch = contentText.match(/Format:\s*(\S+)/i);
      const format = formatMatch ? formatMatch[1] : '';

      const fullUrl = detailUrl.startsWith('http') ? detailUrl : `${this.baseUrl}${detailUrl}`;

      results.push({
        name: format ? `${name} [${format}]` : name,
        size,
        sizeBytes,
        seeds: 0,
        leechers: 0,
        source: this.name,
        sourceUrl: fullUrl,
        magnet: null, // will be filled from detail page
        date: 'N/A',
      });
      detailUrls.push(fullUrl);
    });

    // Fetch detail pages for top 10 to get info hashes and build magnet links
    const top = Math.min(results.length, 10);
    const detailPromises = detailUrls.slice(0, top).map(async (url, idx) => {
      try {
        const detailHtml = await this.fetchPage(url);
        const $d = this.parseHTML(detailHtml);

        // Find info hash
        let infoHash = null;
        $d('td').each((_, td) => {
          const text = $d(td).text().trim();
          if (/^[a-f0-9]{40}$/i.test(text)) {
            infoHash = text;
            return false;
          }
        });

        if (infoHash) {
          // Collect trackers
          const trackers = [];
          $d('td').each((_, td) => {
            const text = $d(td).text().trim();
            if (text.startsWith('udp://') || text.startsWith('http://') || text.startsWith('https://')) {
              trackers.push(text);
            }
          });

          const trackerStr = trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');
          results[idx].magnet = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(results[idx].name)}${trackerStr}`;
        }
      } catch (e) {
        // Detail page failed, no magnet — that's ok
      }
    });

    await Promise.allSettled(detailPromises);
    return results;
  }
}

module.exports = AudioBookBayScraper;

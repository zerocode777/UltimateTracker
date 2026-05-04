const BaseScraper = require('./base');

class PopularYTS extends BaseScraper {
  constructor() {
    super('YTS', 'https://yts.mx');
  }

  async fetch(category) {
    if (category !== 'movies') return [];

    try {
      const [page1, page2] = await Promise.all([
        this.fetchJSON(`${this.baseUrl}/api/v2/list_movies.json?sort_by=seeds&order_by=desc&limit=50&page=1`),
        this.fetchJSON(`${this.baseUrl}/api/v2/list_movies.json?sort_by=seeds&order_by=desc&limit=50&page=2`),
      ]);

      const movies = [];
      for (const data of [page1, page2]) {
        if (data.data && data.data.movies) {
          movies.push(...data.data.movies);
        }
      }

      const results = [];
      for (const movie of movies) {
        if (!movie.torrents || movie.torrents.length === 0) continue;

        // Find torrent with highest seed count
        let bestTorrent = movie.torrents[0];
        for (const torrent of movie.torrents) {
          if ((torrent.seeds || 0) > (bestTorrent.seeds || 0)) {
            bestTorrent = torrent;
          }
        }

        // Skip dead torrents (0 seeds)
        if (!bestTorrent.seeds || bestTorrent.seeds === 0) continue;

        const name = `${movie.title} (${movie.year}) [${bestTorrent.quality}]`;
        results.push({
          name,
          size: bestTorrent.size || 'N/A',
          sizeBytes: bestTorrent.size_bytes || 0,
          seeds: bestTorrent.seeds,
          leechers: bestTorrent.peers || 0,
          source: 'YTS',
          sourceUrl: `https://yts.mx/movie/${movie.id}`,
          magnet: this.buildMagnet(bestTorrent.hash, name),
          date: bestTorrent.date_uploaded ? bestTorrent.date_uploaded.split(' ')[0] : 'N/A',
          category: 'movies',
        });
      }

      // Sort by seeds descending and return top 100
      return results
        .sort((a, b) => b.seeds - a.seeds)
        .slice(0, 100);
    } catch (err) {
      console.error(`PopularYTS fetch error: ${err.message}`);
      return [];
    }
  }

  buildMagnet(hash, name) {
    const trackers = [
      'udp://tracker.opentrackr.org:1337',
      'udp://open.tracker.cl:1337',
    ];
    const tr = trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');
    return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}${tr}`;
  }
}

module.exports = new PopularYTS();

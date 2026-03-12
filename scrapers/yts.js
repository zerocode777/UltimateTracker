const BaseScraper = require('./base');

class YTSScraper extends BaseScraper {
  constructor() {
    super('YTS', 'https://yts.torrentbay.st');
  }

  async search(query) {
    const url = `${this.baseUrl}/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}&limit=30&sort_by=seeds`;
    const data = await this.fetchJSON(url);

    if (!data.data || !data.data.movies) return [];

    const results = [];
    for (const movie of data.data.movies) {
      if (!movie.torrents) continue;
      for (const torrent of movie.torrents) {
        results.push({
          name: `${movie.title} (${movie.year}) [${torrent.quality}] [${torrent.type}]`,
          size: torrent.size || 'N/A',
          sizeBytes: torrent.size_bytes || 0,
          seeds: torrent.seeds || 0,
          leechers: torrent.peers || 0,
          source: this.name,
          sourceUrl: movie.url,
          magnet: this.buildMagnet(torrent.hash, movie.title),
          date: torrent.date_uploaded ? torrent.date_uploaded.split(' ')[0] : 'N/A',
          category: 'Movies',
        });
      }
    }
    return results;
  }

  buildMagnet(hash, name) {
    const trackers = [
      'udp://open.demonii.com:1337/announce',
      'udp://tracker.openbittorrent.com:80',
      'udp://tracker.coppersurfer.tk:6969',
      'udp://glotorrents.pw:6969/announce',
      'udp://tracker.opentrackr.org:1337/announce',
      'udp://torrent.gresille.org:80/announce',
      'udp://p4p.arenabg.com:1337',
      'udp://tracker.leechers-paradise.org:6969',
    ];
    const tr = trackers.map(t => `&tr=${encodeURIComponent(t)}`).join('');
    return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}${tr}`;
  }
}

module.exports = YTSScraper;

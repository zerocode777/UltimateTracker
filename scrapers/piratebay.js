const BaseScraper = require('./base');

class PirateBayScraper extends BaseScraper {
  constructor() {
    super('The Pirate Bay', 'https://apibay.org');
  }

  // TPB category codes
  static CAT_MAP = {
    all: 0,
    movies: 200,    // Video
    tv: 200,        // Video
    anime: 200,     // Video
    cartoons: 200,  // Video
    ebooks: 601,    // E-books subcategory
    audiobooks: 102, // Audio books subcategory
    software: 300,  // Applications
    games: 400,     // Games
    music: 100,     // Audio
    balkan: 0,
    'balkan-cartoons': 200,
    'balkan-games': 400,
  };

  async search(query, category = 'all') {
    const cat = PirateBayScraper.CAT_MAP[category] || 0;
    const url = `${this.baseUrl}/q.php?q=${encodeURIComponent(query)}&cat=${cat}`;
    const data = await this.fetchJSON(url);

    if (!Array.isArray(data) || (data.length === 1 && data[0].name === 'No results returned')) {
      return [];
    }

    return data.slice(0, 40).map(item => ({
      name: item.name,
      size: this.formatSize(parseInt(item.size)),
      sizeBytes: parseInt(item.size) || 0,
      seeds: parseInt(item.seeders) || 0,
      leechers: parseInt(item.leechers) || 0,
      source: this.name,
      sourceUrl: `https://thepiratebay.org/description.php?id=${item.id}`,
      magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce`,
      date: item.added ? new Date(parseInt(item.added) * 1000).toISOString().split('T')[0] : 'N/A',
      category: this.mapCategory(item.category),
    }));
  }

  mapCategory(cat) {
    const catNum = parseInt(cat);
    if (catNum >= 100 && catNum < 200) return 'Audio';
    if (catNum >= 200 && catNum < 300) return 'Video';
    if (catNum >= 300 && catNum < 400) return 'Software';
    if (catNum >= 400 && catNum < 500) return 'Games';
    if (catNum >= 500 && catNum < 600) return 'Adult';
    if (catNum >= 600 && catNum < 700) return 'Other';
    return 'Other';
  }
}

module.exports = PirateBayScraper;

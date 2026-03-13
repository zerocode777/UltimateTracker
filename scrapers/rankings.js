const BaseScraper = require('./base');

// Curated top lists
const RANKINGS = {
  movies: {
    title: 'IMDB Top 250 Movies',
    icon: '🎬',
    items: [
      'The Shawshank Redemption 1994', 'The Godfather 1972', 'The Dark Knight 2008',
      'The Godfather Part II 1974', 'Schindlers List 1993', '12 Angry Men 1957',
      'The Lord of the Rings The Return of the King 2003', 'Pulp Fiction 1994',
      'The Lord of the Rings The Fellowship of the Ring 2001', 'The Good the Bad and the Ugly 1966',
      'Forrest Gump 1994', 'Fight Club 1999', 'Inception 2010',
      'The Lord of the Rings The Two Towers 2002', 'Star Wars Episode V The Empire Strikes Back 1980',
      'The Matrix 1999', 'Goodfellas 1990', 'One Flew Over the Cuckoos Nest 1975',
      'Se7en 1995', 'Its a Wonderful Life 1946', 'The Silence of the Lambs 1991',
      'Saving Private Ryan 1998', 'City of God 2002', 'Interstellar 2014',
      'Life Is Beautiful 1997', 'The Green Mile 1999', 'Spirited Away 2001',
      'Parasite 2019', 'The Pianist 2002', 'Back to the Future 1985',
      'The Departed 2006', 'Gladiator 2000', 'Whiplash 2014',
      'The Prestige 2006', 'The Lion King 1994', 'Terminator 2 Judgment Day 1991',
      'American History X 1998', 'The Usual Suspects 1995', 'Cinema Paradiso 1988',
      'Grave of the Fireflies 1988', 'Leon The Professional 1994', 'Casablanca 1942',
      'The Intouchables 2011', 'Modern Times 1936', 'Hara Kiri 1962',
      'Rear Window 1954', 'Once Upon a Time in the West 1968', 'Alien 1979',
      'City Lights 1931', 'Psycho 1960', 'Apocalypse Now 1979',
      'Memento 2000', 'Django Unchained 2012', 'The Lives of Others 2006',
      'WALL-E 2008', 'Paths of Glory 1957', 'Sunset Boulevard 1950',
      'Raiders of the Lost Ark 1981', 'The Shining 1980', 'Witness for the Prosecution 1957',
      'Princess Mononoke 1997', 'Oldboy 2003', 'The Dark Knight Rises 2012',
      'Aliens 1986', 'Das Boot 1981', 'Avengers Infinity War 2018',
      'Good Will Hunting 1997', 'Toy Story 1995', 'Amadeus 1984',
      'Coco 2017', 'Inglourious Basterds 2009', 'Joker 2019',
      'Braveheart 1995', 'The Apartment 1960', 'Toy Story 3 2010',
      'Full Metal Jacket 1987', 'Requiem for a Dream 2000', 'A Beautiful Mind 2001',
      'Eternal Sunshine of the Spotless Mind 2004', 'Snatch 2000', 'Scarface 1983',
      'Reservoir Dogs 1992', 'The Hunt 2012', 'Blade Runner 1982',
      'No Country for Old Men 2007', 'Shutter Island 2010', 'The Wolf of Wall Street 2013',
      'There Will Be Blood 2007', 'Up 2009', 'The Truman Show 1998',
      'A Clockwork Orange 1971', 'V for Vendetta 2005', 'Gone Girl 2014',
      'Gran Torino 2008', 'The Sixth Sense 1999', 'Mad Max Fury Road 2015',
      'Jurassic Park 1993', 'Kill Bill Vol 1 2003', 'The Thing 1982',
      'Blade Runner 2049 2017', 'Fargo 1996', 'The Grand Budapest Hotel 2014',
      'The Big Lebowski 1998', 'Come and See 1985', 'Inside Out 2015',
      'Heat 1995', 'Seven Samurai 1954', '2001 A Space Odyssey 1968',
      'Star Wars 1977', 'Vertigo 1958', 'Lawrence of Arabia 1962',
      'Dr Strangelove 1964', 'Taxi Driver 1976', 'Raging Bull 1980',
      'Network 1976', 'Chinatown 1974', 'Dog Day Afternoon 1975',
      'Barry Lyndon 1975', 'The French Connection 1971',
      'The Deer Hunter 1978', 'Platoon 1986', 'Bicycle Thieves 1948',
      'Rashomon 1950', 'Ikiru 1952', 'Tokyo Story 1953',
      'The Seventh Seal 1957', 'Wild Strawberries 1957', 'M 1931',
      'The Third Man 1949', '8 and a Half 1963', 'The 400 Blows 1959',
      'Ran 1985', 'Yojimbo 1961', 'Metropolis 1927',
      'Pans Labyrinth 2006', 'Amelie 2001', 'Downfall 2004',
      'Mulholland Drive 2001', 'Lost in Translation 2003',
      'Crouching Tiger Hidden Dragon 2000', 'In the Mood for Love 2000',
      'A Separation 2011', 'The Secret in Their Eyes 2009',
      'Incendies 2010', '3 Idiots 2009', 'Slumdog Millionaire 2008',
      'The Hurt Locker 2008', 'La La Land 2016', 'Arrival 2016',
      'Dunkirk 2017', 'Get Out 2017', 'Boyhood 2014',
      'Spotlight 2015', 'Birdman 2014', 'The Revenant 2015',
      '12 Years a Slave 2013', 'Prisoners 2013', 'Argo 2012',
      'Moonlight 2016', 'The Shape of Water 2017', 'Green Book 2018',
      '1917 2019', 'Knives Out 2019', 'Once Upon a Time in Hollywood 2019',
      'Nomadland 2020', 'The Father 2020', 'Drive My Car 2021',
      'Everything Everywhere All at Once 2022', 'The Banshees of Inisherin 2022',
      'Tar 2022', 'All Quiet on the Western Front 2022',
      'Oppenheimer 2023', 'Anatomy of a Fall 2023',
      'Past Lives 2023', 'Poor Things 2023', 'The Zone of Interest 2023',
      'Killers of the Flower Moon 2023',
      'Unforgiven 1992', 'The Great Escape 1963',
      'Bridge on the River Kwai 1957', 'Cool Hand Luke 1967',
      'Annie Hall 1977', 'Rocky 1976', 'Platoon 1986',
      'The Silence of the Lambs 1991', 'Titanic 1997',
      'American Beauty 1999', 'A Beautiful Mind 2001',
      'Million Dollar Baby 2004', 'Brokeback Mountain 2005',
      'The Kings Speech 2010', 'The Artist 2011',
      'Before Sunrise 1995', 'Before Sunset 2004', 'Before Midnight 2013',
      'Portrait of a Lady on Fire 2019', 'Cold War 2018',
      'Burning 2018', 'The Handmaiden 2016',
      'Shoplifters 2018', 'Capernaum 2018',
      'The Wizard of Oz 1939', 'North by Northwest 1959',
      'Rope 1948', 'Strangers on a Train 1951',
      'To Kill a Mockingbird 1962', 'Butch Cassidy and the Sundance Kid 1969',
      'The Sting 1973', 'Chinatown 1974',
      'Kramer vs Kramer 1979', 'Ordinary People 1980',
      'Gandhi 1982', 'Rain Man 1988',
      'Dances with Wolves 1990', 'Philadelphia 1993',
      'The English Patient 1996', 'Shakespeare in Love 1998',
      'Chicago 2002', 'Crash 2004',
      'Zodiac 2007', 'The Wrestler 2008',
      'True Grit 2010', 'The Social Network 2010',
      'La Haine 1995', 'City of Men 2007',
      'Judgment at Nuremberg 1961', 'A Man for All Seasons 1966',
      'The Apartment 1960', 'Witness for the Prosecution 1957',
      'Rebecca 1940', 'Notorious 1946', 'Spellbound 1945',
      'The Philadelphia Story 1940', 'His Girl Friday 1940',
      'Stagecoach 1939', 'Mr Smith Goes to Washington 1939',
      'Double Indemnity 1944', 'Laura 1944', 'Mildred Pierce 1945',
      'All About Eve 1950', 'Sunset Boulevard 1950',
      'Roman Holiday 1953', 'Rear Window 1954',
      'Charade 1963', 'The Manchurian Candidate 1962',
      'Dr No 1962', 'Goldfinger 1964',
      'The Italian Job 1969', 'Dirty Harry 1971', 'Bullitt 1968',
    ],
  },

  tv: {
    title: 'Top 100 TV Series',
    icon: '📺',
    items: [
      'Breaking Bad', 'Game of Thrones', 'The Wire', 'The Sopranos',
      'Chernobyl', 'Band of Brothers', 'Planet Earth II', 'Planet Earth',
      'Avatar The Last Airbender', 'Rick and Morty', 'Sherlock', 'The Office US',
      'Better Call Saul', 'Stranger Things', 'Dark', 'True Detective',
      'The Mandalorian', 'Friends', 'Fargo', 'Westworld',
      'Dexter', 'House of Cards', 'Peaky Blinders', 'Narcos',
      'The Boys', 'Black Mirror', 'Vikings', 'Money Heist',
      'The Crown', 'Mr Robot', 'Fleabag', 'The Expanse',
      'Arcane', 'Succession', 'House MD', 'Lost',
      'Prison Break', 'The Walking Dead', 'Seinfeld', 'Suits',
      'How I Met Your Mother', 'The Witcher', 'Ozark', 'Squid Game',
      'Attack on Titan', 'Death Note', 'Fullmetal Alchemist Brotherhood',
      'One Piece', 'Demon Slayer', 'Wednesday', 'The Last of Us',
      'Daredevil', 'Loki', 'Invincible', 'Severance',
      'Ted Lasso', 'The Bear', 'Yellowjackets', 'Shogun',
      'Fallout', 'Andor', 'House of the Dragon', 'The Penguin',
      'Reacher', 'Slow Horses', 'For All Mankind', 'Foundation',
      'Mindhunter', 'Hannibal', 'The Americans', 'Homeland',
      'Killing Eve', 'Euphoria', 'Cobra Kai', 'Lucifer',
      'Brooklyn Nine-Nine', 'Parks and Recreation', 'Its Always Sunny in Philadelphia',
      'Curb Your Enthusiasm', 'Arrested Development', 'Community',
      'The Good Place', 'Schitts Creek', 'What We Do in the Shadows',
      'Only Murders in the Building', 'Abbott Elementary', 'Barry',
      'Bojack Horseman', 'Futurama', 'South Park', 'The Simpsons',
      'Family Guy', 'Castlevania', 'Cyberpunk Edgerunners', 'Vinland Saga',
      'Jujutsu Kaisen', 'Spy x Family', 'Chainsaw Man', 'Frieren',
      'Solo Leveling', 'Mushoku Tensei',
    ],
  },

  games: {
    title: 'Top 100 Games of All Time',
    icon: '🎮',
    items: [
      'The Legend of Zelda Breath of the Wild', 'The Witcher 3 Wild Hunt',
      'Red Dead Redemption 2', 'Grand Theft Auto V', 'The Last of Us',
      'Elden Ring', 'God of War 2018', 'Baldurs Gate 3',
      'Portal 2', 'Half-Life 2', 'Mass Effect 2', 'BioShock',
      'Dark Souls', 'Skyrim', 'Minecraft', 'Hades',
      'Hollow Knight', 'Celeste', 'Disco Elysium', 'Divinity Original Sin 2',
      'Stardew Valley', 'Undertale', 'Outer Wilds', 'Sekiro Shadows Die Twice',
      'God of War Ragnarok', 'Horizon Zero Dawn', 'Ghost of Tsushima',
      'Spider-Man PS4', 'Uncharted 4', 'The Last of Us Part II',
      'Death Stranding', 'Metal Gear Solid V The Phantom Pain',
      'Resident Evil 4 Remake', 'Resident Evil 2 Remake', 'Resident Evil Village',
      'Final Fantasy VII Remake', 'Persona 5 Royal', 'NieR Automata',
      'Dragon Quest XI', 'Fire Emblem Three Houses', 'Xenoblade Chronicles 3',
      'Monster Hunter World', 'Devil May Cry 5', 'Bayonetta',
      'Doom Eternal', 'Doom 2016', 'Wolfenstein The New Order',
      'Cyberpunk 2077', 'Starfield', 'Fallout 4', 'Fallout New Vegas',
      'Civilization VI', 'XCOM 2', 'Total War Warhammer III',
      'Crusader Kings III', 'Cities Skylines', 'Factorio',
      'Rimworld', 'Terraria', 'Subnautica', 'Satisfactory',
      'No Mans Sky', 'Valheim', 'Deep Rock Galactic',
      'It Takes Two', 'A Way Out', 'Overcooked 2',
      'Among Us', 'Fall Guys', 'Rocket League',
      'Forza Horizon 5', 'Gran Turismo 7', 'F1 2023',
      'FIFA 23', 'NBA 2K23', 'WWE 2K23',
      'Alan Wake 2', 'Control', 'Returnal',
      'Ratchet and Clank Rift Apart', 'Astro Bot',
      'Super Mario Odyssey', 'Super Mario Wonder',
      'Animal Crossing New Horizons', 'Splatoon 3',
      'Metroid Dread', 'Tears of the Kingdom',
      'Cuphead', 'Ori and the Will of the Wisps', 'Dead Cells',
      'Hades II', 'Vampire Survivors', 'Lethal Company',
      'Palworld', 'Helldivers 2', 'Lies of P',
      'Star Wars Jedi Survivor', 'Hogwarts Legacy',
      'Armored Core VI', 'Street Fighter 6',
      'Mortal Kombat 1', 'Tekken 8',
      'Diablo IV', 'Path of Exile 2',
    ],
  },

  books: {
    title: 'Top 100 Books of All Time',
    icon: '📚',
    items: [
      'A Song of Ice and Fire George R R Martin',
      'The Lord of the Rings J R R Tolkien', 'Harry Potter J K Rowling',
      '1984 George Orwell', 'To Kill a Mockingbird Harper Lee',
      'The Great Gatsby F Scott Fitzgerald', 'One Hundred Years of Solitude Gabriel Garcia Marquez',
      'The Hitchhikers Guide to the Galaxy Douglas Adams', 'Dune Frank Herbert',
      'Pride and Prejudice Jane Austen', 'The Catcher in the Rye J D Salinger',
      'Brave New World Aldous Huxley', 'The Hobbit J R R Tolkien',
      'Fahrenheit 451 Ray Bradbury', 'Animal Farm George Orwell',
      'The Name of the Wind Patrick Rothfuss', 'The Way of Kings Brandon Sanderson',
      'Foundation Isaac Asimov', 'Neuromancer William Gibson',
      'Enders Game Orson Scott Card', 'The Martian Andy Weir',
      'Ready Player One Ernest Cline', 'Project Hail Mary Andy Weir',
      'Mistborn Brandon Sanderson', 'The First Law Joe Abercrombie',
      'American Gods Neil Gaiman', 'Good Omens Neil Gaiman Terry Pratchett',
      'Discworld Terry Pratchett', 'The Wheel of Time Robert Jordan',
      'Malazan Book of the Fallen Steven Erikson',
      'The Dark Tower Stephen King', 'It Stephen King', 'The Shining Stephen King',
      'Dracula Bram Stoker', 'Frankenstein Mary Shelley',
      'Crime and Punishment Fyodor Dostoevsky', 'War and Peace Leo Tolstoy',
      'The Brothers Karamazov Fyodor Dostoevsky', 'Anna Karenina Leo Tolstoy',
      'Don Quixote Miguel de Cervantes', 'The Count of Monte Cristo Alexandre Dumas',
      'Les Miserables Victor Hugo', 'Moby Dick Herman Melville',
      'Jane Eyre Charlotte Bronte', 'Wuthering Heights Emily Bronte',
      'Great Expectations Charles Dickens', 'A Tale of Two Cities Charles Dickens',
      'The Picture of Dorian Gray Oscar Wilde',
      'The Alchemist Paulo Coelho', 'Sapiens Yuval Noah Harari',
      'Thinking Fast and Slow Daniel Kahneman', 'Atomic Habits James Clear',
      'The 48 Laws of Power Robert Greene', 'How to Win Friends and Influence People Dale Carnegie',
      'The Art of War Sun Tzu', 'Meditations Marcus Aurelius',
      'The Subtle Art of Not Giving a F Mark Manson',
      'Man Search for Meaning Viktor Frankl', 'The Power of Habit Charles Duhigg',
      'Educated Tara Westover', 'Becoming Michelle Obama',
      'Born a Crime Trevor Noah', 'The Diary of a Young Girl Anne Frank',
      'A Brief History of Time Stephen Hawking', 'Cosmos Carl Sagan',
      'The Selfish Gene Richard Dawkins', 'Guns Germs and Steel Jared Diamond',
      'Freakonomics Steven Levitt', 'Outliers Malcolm Gladwell',
      'The Hunger Games Suzanne Collins', 'Divergent Veronica Roth',
      'The Maze Runner James Dashner', 'Percy Jackson Rick Riordan',
      'Twilight Stephenie Meyer', 'The Fault in Our Stars John Green',
      'Gone Girl Gillian Flynn', 'The Girl with the Dragon Tattoo Stieg Larsson',
      'The Da Vinci Code Dan Brown', 'Angels and Demons Dan Brown',
      'Inferno Dan Brown', 'The Silent Patient Alex Michaelides',
      'Where the Crawdads Sing Delia Owens', 'The Kite Runner Khaled Hosseini',
      'Life of Pi Yann Martel', 'The Road Cormac McCarthy',
      'Blood Meridian Cormac McCarthy', 'Slaughterhouse Five Kurt Vonnegut',
      'Cat Cradle Kurt Vonnegut', 'Catch 22 Joseph Heller',
      'The Bell Jar Sylvia Plath', 'On the Road Jack Kerouac',
      'Fear and Loathing in Las Vegas Hunter S Thompson',
      'A Clockwork Orange Anthony Burgess', 'The Handmaids Tale Margaret Atwood',
      'Never Let Me Go Kazuo Ishiguro', 'The Remains of the Day Kazuo Ishiguro',
      'Norwegian Wood Haruki Murakami', 'Kafka on the Shore Haruki Murakami',
      '1Q84 Haruki Murakami', 'The Wind Up Bird Chronicle Haruki Murakami',
      'Flowers for Algernon Daniel Keyes',
    ],
  },

  audiobooks: {
    title: 'Top 100 Audiobooks',
    icon: '🎧',
    items: [
      'Harry Potter complete series Stephen Fry',
      'The Lord of the Rings audiobook', 'A Song of Ice and Fire audiobook',
      'Project Hail Mary Andy Weir audiobook', 'The Hitchhikers Guide to the Galaxy audiobook',
      'Dune Frank Herbert audiobook', '1984 George Orwell audiobook',
      'The Martian Andy Weir audiobook', 'Sapiens Yuval Noah Harari audiobook',
      'Educated Tara Westover audiobook', 'Atomic Habits James Clear audiobook',
      'The Name of the Wind audiobook', 'Mistborn Brandon Sanderson audiobook',
      'The Way of Kings Brandon Sanderson audiobook', 'Ready Player One audiobook',
      'Enders Game audiobook', 'The Hobbit audiobook',
      'American Gods Neil Gaiman audiobook', 'Good Omens audiobook',
      'Neverwhere Neil Gaiman audiobook', 'The Ocean at the End of the Lane audiobook',
      'Born a Crime Trevor Noah audiobook', 'Becoming Michelle Obama audiobook',
      'A Brief History of Time Stephen Hawking audiobook', 'Cosmos Carl Sagan audiobook',
      'Thinking Fast and Slow audiobook', 'The Power of Habit audiobook',
      'Outliers Malcolm Gladwell audiobook', 'Freakonomics audiobook',
      'The 48 Laws of Power audiobook', 'How to Win Friends and Influence People audiobook',
      'The Subtle Art of Not Giving audiobook', 'Man Search for Meaning audiobook',
      'Meditations Marcus Aurelius audiobook', 'The Art of War Sun Tzu audiobook',
      'Brave New World audiobook', 'Fahrenheit 451 audiobook',
      'Animal Farm audiobook', 'Catch 22 audiobook',
      'Slaughterhouse Five audiobook', 'The Catcher in the Rye audiobook',
      'To Kill a Mockingbird audiobook', 'The Great Gatsby audiobook',
      'Crime and Punishment audiobook', 'The Brothers Karamazov audiobook',
      'War and Peace audiobook', 'Anna Karenina audiobook',
      'Pride and Prejudice audiobook', 'Jane Eyre audiobook',
      'Dracula Bram Stoker audiobook', 'Frankenstein audiobook',
      'The Count of Monte Cristo audiobook', 'Les Miserables audiobook',
      'Gone Girl audiobook', 'The Girl with the Dragon Tattoo audiobook',
      'The Da Vinci Code audiobook', 'The Silent Patient audiobook',
      'Where the Crawdads Sing audiobook', 'The Kite Runner audiobook',
      'Life of Pi audiobook', 'The Road Cormac McCarthy audiobook',
      'Blood Meridian audiobook', 'No Country for Old Men audiobook',
      'The Dark Tower Stephen King audiobook', 'It Stephen King audiobook',
      'The Shining Stephen King audiobook', 'Pet Sematary audiobook',
      'The Stand Stephen King audiobook', '11 22 63 Stephen King audiobook',
      'Discworld Terry Pratchett audiobook', 'The Wheel of Time audiobook',
      'Foundation Isaac Asimov audiobook', 'Neuromancer audiobook',
      'The Expanse James Corey audiobook', 'Red Rising Pierce Brown audiobook',
      'The First Law Joe Abercrombie audiobook', 'Malazan Book of the Fallen audiobook',
      'Stormlight Archive audiobook', 'Kingkiller Chronicle audiobook',
      'The Hunger Games audiobook', 'Divergent audiobook',
      'Percy Jackson audiobook', 'The Fault in Our Stars audiobook',
      'A Clockwork Orange audiobook', 'The Handmaids Tale audiobook',
      'Norwegian Wood Haruki Murakami audiobook', '1Q84 audiobook',
      'Kafka on the Shore audiobook', 'Never Let Me Go audiobook',
      'The Remains of the Day audiobook', 'Flowers for Algernon audiobook',
      'The Picture of Dorian Gray audiobook', 'The Alchemist Paulo Coelho audiobook',
      'Siddhartha Hermann Hesse audiobook', 'One Hundred Years of Solitude audiobook',
      'Don Quixote audiobook', 'The Bell Jar audiobook',
      'On the Road Jack Kerouac audiobook', 'Fear and Loathing audiobook',
      'Guns Germs and Steel audiobook', 'A Short History of Nearly Everything audiobook',
      'The Selfish Gene audiobook', 'Shoe Dog Phil Knight audiobook',
      'Steve Jobs Walter Isaacson audiobook',
    ],
  },
};

class RankingsSearcher {
  constructor() {
    this.fetcher = new BaseScraper('Rankings', 'https://apibay.org');
  }

  getTypes() {
    return Object.entries(RANKINGS).map(([id, data]) => ({
      id,
      title: data.title,
      icon: data.icon,
      count: data.items.length,
    }));
  }

  async searchItem(title, category) {
    // Map ranking type to TPB category code
    const catMap = { movies: 200, tv: 200, games: 400, books: 601, audiobooks: 102 };
    const cat = catMap[category] || 0;

    // For audiobooks: try Croatian first, fall back to English
    if (category === 'audiobooks') {
      // Strip "audiobook" keyword to get clean title for Croatian search
      const cleanTitle = title.replace(/\s*audiobook\s*/gi, ' ').trim();
      const croatianQueries = [
        `${cleanTitle} audioknjiga`,
        `${cleanTitle} hrvatski`,
        `${cleanTitle} croatian audiobook`,
      ];

      for (const cQuery of croatianQueries) {
        const cUrl = `https://apibay.org/q.php?q=${encodeURIComponent(cQuery)}&cat=${cat}`;
        try {
          const cData = await this.fetcher.fetchJSON(cUrl);
          if (Array.isArray(cData) && !(cData.length === 1 && cData[0].name === 'No results returned')) {
            const cTitleWords = cleanTitle.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
            const cImportant = cTitleWords.slice(0, Math.min(3, cTitleWords.length));
            const cRelevant = cData.filter(item => {
              const nameLower = item.name.toLowerCase().replace(/[.\-_]/g, ' ');
              return cImportant.every(w => nameLower.includes(w));
            });
            if (cRelevant.length > 0) {
              return this.pickBest(cRelevant, '🇭🇷 ');
            }
          }
        } catch (e) { /* try next query */ }
      }
      // Fall through to normal English search below
    }

    // For TV, search for complete series / season packs
    let searchQuery = title;
    if (category === 'tv') {
      searchQuery = `${title} complete`;
    }

    const url = `https://apibay.org/q.php?q=${encodeURIComponent(searchQuery)}&cat=${cat}`;
    try {
      let data = await this.fetcher.fetchJSON(url);
      if (!Array.isArray(data) || (data.length === 1 && data[0].name === 'No results returned')) {
        // Fallback: try without "complete" for TV
        if (category === 'tv') {
          const fallbackUrl = `https://apibay.org/q.php?q=${encodeURIComponent(title)}&cat=${cat}`;
          data = await this.fetcher.fetchJSON(fallbackUrl);
          if (!Array.isArray(data) || (data.length === 1 && data[0].name === 'No results returned')) {
            return null;
          }
        } else {
          return null;
        }
      }

      // Filter to results that contain the key words from the title
      const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
      // For movies/games, the first few words (title) are most important
      const importantWords = titleWords.slice(0, Math.min(3, titleWords.length));

      let relevant = data.filter(item => {
        const nameLower = item.name.toLowerCase().replace(/[.\-_]/g, ' ');
        return importantWords.every(w => nameLower.includes(w));
      });

      if (relevant.length === 0) return null;

      // For TV series: smart filtering — prefer complete series > multi-season > 3+ seasons
      if (category === 'tv') {
        const singleEpPattern = /s\d{2}e\d{2}|episode\s*\d+|\d+x\d+/i;
        // Matches "S01" or "Season 1" but NOT "S01-S05" or "Seasons 1-5"
        const singleSeasonPattern = /\b(?:s\d{2}(?!\s*-\s*s\d{2})(?!\s*s\d{2})(?!\s*to\s*s)|season\s*\d+(?!\s*-\s*\d+)(?!\s*to\s*\d+))(?:\s|$|\.|-|_|complete|full)/i;
        const multiSeasonPattern = /s\d{2}\s*-\s*s\d{2}|s\d{2}\s*s\d{2}|seasons?\s*\d+\s*-\s*\d+|seasons?\s*\d+\s*to\s*\d+|all\s*\d+\s*seasons?/i;
        const completeSeriesKeywords = ['complete series', 'complete collection', 'the complete', 'full series', 'all seasons'];

        function scoreTVPack(item) {
          const nameLower = item.name.toLowerCase().replace(/[.\-_]/g, ' ');
          const size = parseInt(item.size) || 0;
          const isSingleEp = singleEpPattern.test(item.name);
          if (isSingleEp) return -1; // never want single episodes

          const isCompleteSeries = completeSeriesKeywords.some(kw => nameLower.includes(kw));
          const isMultiSeason = multiSeasonPattern.test(item.name);
          const isSingleSeason = singleSeasonPattern.test(item.name) && !isMultiSeason;
          const isHuge = size > 50 * 1024 * 1024 * 1024; // >50GB = likely full series
          const isLarge = size > 10 * 1024 * 1024 * 1024; // >10GB = likely multi-season

          // Extract season count from multi-season patterns like "S01-S05"
          let seasonCount = 0;
          const rangeMatch = item.name.match(/s(\d{2})\s*-\s*s(\d{2})/i) || item.name.match(/seasons?\s*(\d+)\s*-\s*(\d+)/i);
          if (rangeMatch) seasonCount = parseInt(rangeMatch[2]) - parseInt(rangeMatch[1]) + 1;

          // Score: higher = better
          if (isCompleteSeries || isHuge) return 100;
          if (isMultiSeason && seasonCount >= 3) return 80 + seasonCount;
          if (isMultiSeason) return 60 + seasonCount;
          if (isLarge && !isSingleSeason) return 50;
          if (isSingleSeason) return 10; // single season is last resort
          return 30; // ambiguous — no season marker, could be anything
        }

        // Score all relevant items
        const scored = relevant.map(item => ({ item, score: scoreTVPack(item) })).filter(s => s.score >= 0);

        if (scored.length > 0) {
          const maxScore = Math.max(...scored.map(s => s.score));
          // Only keep items within 20 points of the best score
          relevant = scored.filter(s => s.score >= maxScore - 20).map(s => s.item);
        }
      }

      // Pick best by seed/leech ratio
      return this.pickBest(relevant);
    } catch (err) {
      return null;
    }
  }

  pickBest(relevant, namePrefix = '') {
    const best = relevant.reduce((best, item) => {
      const seeds = parseInt(item.seeders) || 0;
      const leechers = parseInt(item.leechers) || 1;
      const ratio = seeds / leechers;
      const bestSeeds = parseInt(best.seeders) || 0;
      const bestLeechers = parseInt(best.leechers) || 1;
      const bestRatio = bestSeeds / bestLeechers;
      if (seeds > 0 && (ratio > bestRatio || (ratio === bestRatio && seeds > bestSeeds))) {
        return item;
      }
      return best;
    }, relevant[0]);

    const seeds = parseInt(best.seeders) || 0;
    const leechers = parseInt(best.leechers) || 0;

    return {
      name: namePrefix + best.name,
      size: this.fetcher.formatSize(parseInt(best.size)),
      sizeBytes: parseInt(best.size) || 0,
      seeds,
      leechers,
      source: 'The Pirate Bay',
      sourceUrl: `https://thepiratebay.org/description.php?id=${best.id}`,
      magnet: `magnet:?xt=urn:btih:${best.info_hash}&dn=${encodeURIComponent(best.name)}&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969%2Fannounce`,
      date: best.added ? new Date(parseInt(best.added) * 1000).toISOString().split('T')[0] : 'N/A',
    };
  }

  // Stream rankings results via callback
  async streamRankings(type, onEvent) {
    const ranking = RANKINGS[type];
    if (!ranking) throw new Error(`Unknown ranking type: ${type}`);

    const items = ranking.items;
    const total = items.length;

    onEvent({ type: 'info', title: ranking.title, icon: ranking.icon, total });

    // Process in batches of 5 concurrent requests
    const BATCH_SIZE = 5;
    let found = 0;
    let processed = 0;

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (title, batchIdx) => {
        const rank = i + batchIdx + 1;
        const result = await this.searchItem(title, type);
        processed++;

        if (result) {
          found++;
          onEvent({
            type: 'result',
            rank,
            queryTitle: title,
            torrent: result,
            progress: { processed, total, found },
          });
        } else {
          onEvent({
            type: 'skip',
            rank,
            queryTitle: title,
            progress: { processed, total, found },
          });
        }
      });

      await Promise.allSettled(promises);
    }
  }
}

module.exports = RankingsSearcher;

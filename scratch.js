const fs = require('fs');
let content = fs.readFileSync('src/app/components/home/home.ts', 'utf8');

const arraysToEmpty = ['heroMovies', 'trendingMovies', 'latestEpisodes', 'spotlightMovies', 'topWatchedMovies', 'comingSoonMovies', 'hiddenGemsMovies', 'topPicksMovies', 'actionMovies'];

for (const arr of arraysToEmpty) {
    const regex = new RegExp(arr + '\\s*:\\s*[a-zA-Z\\[\\]]+\\s*=\\s*\\[[\\s\\S]*?\\];', 'g');
    content = content.replace(regex, arr + ': any[] = [];');
}

fs.writeFileSync('src/app/components/home/home.ts', content);

const fs = require('fs');
let content = fs.readFileSync('src/app/components/home/home.ts', 'utf8');

const replacement =       const cat = this.categoryService.activeCategory();
      this.pageLoaded.set(false);
      
      // Clear arrays immediately to avoid showing wrong category items
      this.heroMovies = [];
      this.trendingMovies = [];
      this.latestEpisodes = [];
      this.newReleasesMovies = [];
      this.topWatchedMovies = [];
      this.spotlightMovies = [];
      this.comingSoonMovies = [];
      this.hiddenGemsMovies = [];
      this.topPicksMovies = [];
      this.actionMovies = [];
      
      this.tmdbService.getHomeData(cat).subscribe(data => {;

content = content.replace(/      const cat = this\.categoryService\.activeCategory\(\);\s+this\.pageLoaded\.set\(false\);\s+this\.tmdbService\.getHomeData\(cat\)\.subscribe\(data => \{/, replacement);

fs.writeFileSync('src/app/components/home/home.ts', content);

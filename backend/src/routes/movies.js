const express = require('express');
const axios = require('axios');
const router = express.Router();

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const HEADERS = {
  accept: 'application/json',
  Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`
};

const GENRE_MAP = {
  28: 'Azione', 12: 'Avventura', 16: 'Animazione', 35: 'Commedia',
  80: 'Crime', 99: 'Documentario', 18: 'Dramma', 10751: 'Famiglia',
  14: 'Fantasy', 36: 'Storia', 27: 'Horror', 10402: 'Musica',
  9648: 'Mistero', 10749: 'Romance', 878: 'Fantascienza', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'Guerra', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News',
  10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
  10767: 'Talk', 10768: 'War & Politics'
};

// Helper function to map TMDB response to our frontend format
function mapMovieItem(res, isSeries) {
  const accentColor = res.backdrop_path ? '#141414' : '#141414';
  let genres = [];
  if (res.genres && Array.isArray(res.genres)) {
    genres = res.genres.map(g => g.name || GENRE_MAP[g.id] || g.id.toString());
  } else if (res.genre_ids && Array.isArray(res.genre_ids)) {
    genres = res.genre_ids.map(id => GENRE_MAP[id] || id.toString());
  }

  return {
    id: res.id,
    title: isSeries ? (res.name || res.title) : (res.title || res.name),
    backdropUrl: res.backdrop_path ? `https://image.tmdb.org/t/p/original${res.backdrop_path}` : 'https://via.placeholder.com/1280x720?text=No+Image',
    primaryColor: accentColor,
    secondaryColor: accentColor,
    duration: isSeries ? 'Varie stagioni' : '2h 15m', // Mock duration
    matchScore: Math.floor((res.vote_average || 0) * 10) + '% Match',
    genres: genres,
    synopsis: res.overview || 'Nessuna sinossi disponibile.',
    posterUrl: res.poster_path ? `https://image.tmdb.org/t/p/w500${res.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster',
    accentColor: accentColor,
    isSeries: isSeries,
    original_language: res.original_language,
    origin_country: res.origin_country || [],
    releaseDate: res.release_date || res.first_air_date || '1970-01-01',
    ratingPercent: Math.round((res.vote_average || 0) * 10),
    watchCount: Math.floor((res.popularity || 0) * 100).toLocaleString('it-IT') + ' visualizzazioni'
  };
}

async function enrichWithDetails(items) {
  const promises = items.map(item => {
    const type = item.isSeries ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${type}/${item.id}?append_to_response=credits&language=it-IT`;
    return axios.get(url, { headers: HEADERS }).catch(() => null);
  });
  const results = await Promise.all(promises);
  
  return items.map((item, index) => {
    const res = results[index];
    if (res && res.data) {
      const d = res.data;
      const crew = d.credits?.crew || [];
      const director = crew.find(c => c.job === 'Director')?.name || 'N/A';
      const cast = d.credits?.cast ? d.credits.cast.slice(0, 5).map(c => c.name) : [];
      
      const formatDuration = (mins) => {
        if (!mins) return 'N/A';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };
      
      const duration = item.isSeries 
          ? (d.episode_run_time && d.episode_run_time.length > 0 ? formatDuration(d.episode_run_time[0]) : 'Varie')
          : formatDuration(d.runtime);
          
      return { ...item, duration, director, stars: cast, matchScore: '95% match' };
    }
    return { ...item, duration: '1h 45m', matchScore: '95% match' };
  });
}

router.get('/trending-top10', async (req, res) => {
  try {
    const category = req.query.category || '';
    let isSeries = category === 'Serie TV' || category === 'Anime';
    const contentType = isSeries ? 'tv' : 'movie';
    const lang = 'language=it-IT';

    let genreFilter = '';
    let langFilter = '';

    if (category === 'Animazione') {
      genreFilter = '16';
      langFilter = '&without_original_language=ja';
    } else if (category === 'Anime') {
      genreFilter = '16';
      langFilter = '&with_original_language=ja';
    }

    let genreFilterStr = genreFilter ? `&with_genres=${genreFilter}` : '';
    let baseUrl = `${TMDB_BASE_URL}/discover/${contentType}?${lang}${langFilter}${genreFilterStr}&sort_by=popularity.desc`;

    const [page1, page2] = await Promise.all([
      axios.get(`${baseUrl}&page=1`, { headers: HEADERS }).catch(() => ({ data: { results: [] } })),
      axios.get(`${baseUrl}&page=2`, { headers: HEADERS }).catch(() => ({ data: { results: [] } }))
    ]);

    const combinedResults = [...(page1.data.results || []), ...(page2.data.results || [])];

    const foreignRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0400-\u04FF\u0E00-\u0E7F\u0600-\u06FF\u0900-\u097F]/;

    const items = combinedResults
      .filter(i => i.poster_path && i.backdrop_path && i.overview && i.overview.trim().length > 10)
      .filter(i => !foreignRegex.test(i.title || i.name || ''))
      .slice(0, 10)
      .map(item => mapMovieItem(item, isSeries));

    res.json(items);
  } catch (error) {
    console.error('Error fetching trending top 10:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch trending top 10' });
  }
});

router.get('/home', async (req, res) => {
  try {
    const category = req.query.category || '';
    const phase = req.query.phase || 'all';
    const cacheKey = `${category}_${phase}`;

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
    }

    let isSeries = false;
    let genreFilter = '';

    if (category === 'Serie TV' || category === 'Anime') isSeries = true;
    if (category === 'Animazione') genreFilter = '16';
    if (category === 'Anime') genreFilter = '16'; // Simplified

    const contentType = isSeries ? 'tv' : 'movie';
    const lang = 'language=it-IT';

    let requests = [];
    let mapIndices = {};

    let today = new Date().toISOString().split('T')[0];
    let pastThreeMonths = new Date();
    pastThreeMonths.setMonth(pastThreeMonths.getMonth() - 3);
    let pastThreeMonthsDate = pastThreeMonths.toISOString().split('T')[0];
    let future = new Date();
    future.setFullYear(future.getFullYear() + 5);
    let futureDate = future.toISOString().split('T')[0];

    let langFilter = '';
    if (category === 'Animazione') langFilter = '&without_original_language=ja';
    if (category === 'Anime') langFilter = '&with_original_language=ja';
    let genreFilterStr = genreFilter ? `&with_genres=${genreFilter}` : '';
    let discoverBase = `${TMDB_BASE_URL}/discover/${contentType}?${lang}${langFilter}`;

    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    let tomorrowDate = tomorrow.toISOString().split('T')[0];

    let nowPlayingUrl = `${discoverBase}&sort_by=popularity.desc${genreFilterStr}&${isSeries ? 'air_date.gte' : 'primary_release_date.gte'}=${pastThreeMonthsDate}&${isSeries ? 'air_date.lte' : 'primary_release_date.lte'}=${today}`;

    let nowPlayingTvUrl = `${TMDB_BASE_URL}/discover/tv?${lang}&sort_by=popularity.desc&air_date.gte=${pastThreeMonthsDate}&air_date.lte=${today}`;

    let trendingUrl = genreFilter || langFilter ?
      `${discoverBase}&sort_by=popularity.desc${genreFilterStr}` :
      `${TMDB_BASE_URL}/trending/${contentType}/week?${lang}`;

    let topRatedUrl = genreFilter || langFilter ?
      `${discoverBase}&sort_by=vote_average.desc&vote_count.gte=500${genreFilterStr}` :
      `${TMDB_BASE_URL}/${contentType}/top_rated?${lang}`;

    let twoMonths = new Date();
    twoMonths.setMonth(twoMonths.getMonth() + 2);
    let twoMonthsDate = twoMonths.toISOString().split('T')[0];

    let strictUpcomingUrl = `${discoverBase}&sort_by=popularity.desc&${isSeries ? 'air_date.gte' : 'primary_release_date.gte'}=${today}&${isSeries ? 'air_date.lte' : 'primary_release_date.lte'}=${twoMonthsDate}${genreFilterStr}`;
    let strictUpcomingMovieUrl = `${TMDB_BASE_URL}/discover/movie?${lang}${langFilter}&sort_by=popularity.desc&primary_release_date.gte=${today}&primary_release_date.lte=${twoMonthsDate}${genreFilterStr}`;

    let voteCountThreshold = category === 'Anime' ? 200 : 3000;
    let classicsUrl = `${discoverBase}&sort_by=vote_average.desc&vote_count.gte=${voteCountThreshold}&${isSeries ? 'first_air_date.lte' : 'primary_release_date.lte'}=2005-01-01${genreFilterStr}`;
    let recentReleasesUrl = `${discoverBase}&sort_by=popularity.desc&${isSeries ? 'air_date.gte' : 'primary_release_date.gte'}=${twoMonthsDate}${genreFilterStr}`;

    let dramaGenre = 18;
    let mysteryGenre = 9648;
    let fantasyGenre = isSeries ? 10765 : 14; // TV uses 10765 for Sci-Fi & Fantasy
    let actionGenre = isSeries ? 10759 : 28; // TV uses 10759 for Action & Adventure

    let spotlightUrl = `${discoverBase}&with_genres=${genreFilter ? genreFilter + ',' + dramaGenre : dramaGenre}`;
    let hiddenGemsUrl = `${discoverBase}&with_genres=${genreFilter ? genreFilter + ',' + mysteryGenre : mysteryGenre}`;
    let topPicksUrl = `${discoverBase}&with_genres=${genreFilter ? genreFilter + ',' + fantasyGenre : fantasyGenre}`;
    let actionUrl = `${discoverBase}&with_genres=${genreFilter ? genreFilter + ',' + actionGenre : actionGenre}`;
    let acclaimedUrl = `${discoverBase}&sort_by=vote_average.desc&vote_count.gte=${voteCountThreshold}${genreFilterStr}`;

    if (phase === '1') {
      requests = [
        axios.get(nowPlayingUrl + '&page=1', { headers: HEADERS }),
        axios.get(trendingUrl + '&page=1', { headers: HEADERS }),
        axios.get(strictUpcomingUrl + '&page=1', { headers: HEADERS })
      ];
      if (category === 'Anime') {
        requests.push(axios.get(strictUpcomingMovieUrl + '&page=1', { headers: HEADERS }));
        mapIndices = { hero: 0, trending: 1, episodes: 2, episodesAnimeMovie: 3 };
      } else {
        mapIndices = { hero: 0, trending: 1, episodes: 2 };
        if (category === '') {
          requests.push(axios.get(nowPlayingTvUrl + '&page=1', { headers: HEADERS }));
          mapIndices.heroTv = requests.length - 1;
        }
      }
    } else if (phase === '2') {
      requests = [
        axios.get(recentReleasesUrl + '&page=1', { headers: HEADERS }),
        axios.get(topRatedUrl + '&page=1', { headers: HEADERS }),
        axios.get(spotlightUrl + '&page=1', { headers: HEADERS }),
        axios.get(classicsUrl + '&page=1', { headers: HEADERS }),
        axios.get(hiddenGemsUrl + '&page=1', { headers: HEADERS }),
        axios.get(topPicksUrl + '&page=1', { headers: HEADERS }),
        axios.get(actionUrl + '&page=1', { headers: HEADERS }),
        axios.get(acclaimedUrl + '&page=1', { headers: HEADERS })
      ];
      mapIndices = { newReleases: 0, topWatched: 1, spotlight: 2, classics: 3, hiddenGems: 4, topPicks: 5, action: 6, acclaimed: 7 };
    } else {
      requests = [
        axios.get(nowPlayingUrl + '&page=1', { headers: HEADERS }),
        axios.get(trendingUrl + '&page=1', { headers: HEADERS }),
        axios.get(strictUpcomingUrl + '&page=1', { headers: HEADERS }),
        axios.get(recentReleasesUrl + '&page=1', { headers: HEADERS }),
        axios.get(topRatedUrl + '&page=1', { headers: HEADERS }),
        axios.get(spotlightUrl + '&page=1', { headers: HEADERS }),
        axios.get(classicsUrl + '&page=1', { headers: HEADERS }),
        axios.get(hiddenGemsUrl + '&page=1', { headers: HEADERS }),
        axios.get(topPicksUrl + '&page=1', { headers: HEADERS }),
        axios.get(actionUrl + '&page=1', { headers: HEADERS }),
        axios.get(acclaimedUrl + '&page=1', { headers: HEADERS })
      ];
      if (category === 'Anime') {
        requests.push(axios.get(strictUpcomingMovieUrl + '&page=1', { headers: HEADERS }));
        mapIndices = { hero: 0, trending: 1, episodes: 2, newReleases: 3, topWatched: 4, spotlight: 5, classics: 6, hiddenGems: 7, topPicks: 8, action: 9, acclaimed: 10, episodesAnimeMovie: 11 };
      } else {
        mapIndices = { hero: 0, trending: 1, episodes: 2, newReleases: 3, topWatched: 4, spotlight: 5, classics: 6, hiddenGems: 7, topPicks: 8, action: 9, acclaimed: 10 };
        if (category === '') {
          requests.push(axios.get(nowPlayingTvUrl + '&page=1', { headers: HEADERS }));
          mapIndices.heroTv = requests.length - 1;
        }
      }
    }

    // Eseguiamo le chiamate simultaneamente
    const results = await Promise.all(requests);
    const data = results.map(r => r.data.results);

    const excludeAnimation = category !== 'Animazione' && category !== 'Anime' && category !== 'Kids';
    const isAnimeCategory = category === 'Anime';
    const isAnimazioneCategory = category === 'Animazione';

    const foreignRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0400-\u04FF\u0E00-\u0E7F\u0600-\u06FF\u0900-\u097F]/;
    // Mappiamo i risultati
    const mapItems = (arr, requireOverview = true, overrideIsSeries = isSeries) => arr
      .filter(i => i.poster_path && i.backdrop_path && (!requireOverview || (i.overview && i.overview.trim().length > 10)))
      .filter(i => !(excludeAnimation && i.genre_ids && i.genre_ids.includes(16)))
      .filter(i => !isAnimeCategory || i.original_language === 'ja')
      .filter(i => !isAnimazioneCategory || i.original_language !== 'ja')
      .filter(i => !foreignRegex.test(i.title || i.name || ''))
      .map(item => mapMovieItem(item, overrideIsSeries));

    const responseData = {};
    if (mapIndices.hero !== undefined) {
      let heroMoviesList = mapItems(data[mapIndices.hero]);
      if (mapIndices.heroTv !== undefined) {
        let heroTvList = mapItems(data[mapIndices.heroTv], false, true);
        heroMoviesList = [...heroMoviesList, ...heroTvList];
      }
      
      const nowTime = Date.now();
      // Keep only items that are already released (date <= today)
      heroMoviesList = heroMoviesList.filter(item => {
        const d = new Date(item.releaseDate).getTime();
        return !isNaN(d) && d <= nowTime;
      });
      // Sort strictly by most recently released first
      heroMoviesList.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      
      responseData.heroMovies = heroMoviesList;
    }
    if (mapIndices.trending !== undefined) responseData.trendingMovies = mapItems(data[mapIndices.trending]);
    if (mapIndices.episodes !== undefined) {
      let eps = mapItems(data[mapIndices.episodes], false);
      if (mapIndices.episodesAnimeMovie !== undefined) {
        let movieEps = mapItems(data[mapIndices.episodesAnimeMovie], false);
        eps = [...eps, ...movieEps];
      }
      responseData.latestEpisodes = eps.map(x => ({ ...x, bannerUrl: x.backdropUrl, seriesTitle: x.title, seasonEpisode: 'Novit\u00E0' }));
    }
    if (mapIndices.newReleases !== undefined) responseData.newReleasesMovies = mapItems(data[mapIndices.newReleases], false);
    if (mapIndices.topWatched !== undefined) responseData.topWatchedMovies = mapItems(data[mapIndices.topWatched]);
    if (mapIndices.spotlight !== undefined) {
      const spotlightItems = mapItems(data[mapIndices.spotlight]).slice(0, 10);
      responseData.spotlightMovies = await enrichWithDetails(spotlightItems);
    }
    if (mapIndices.classics !== undefined) responseData.classicsMovies = mapItems(data[mapIndices.classics], false);
    if (mapIndices.hiddenGems !== undefined) responseData.hiddenGemsMovies = mapItems(data[mapIndices.hiddenGems]);
    if (mapIndices.topPicks !== undefined) responseData.topPicksMovies = mapItems(data[mapIndices.topPicks]);
    if (mapIndices.action !== undefined) responseData.actionMovies = mapItems(data[mapIndices.action]);
    if (mapIndices.acclaimed !== undefined) responseData.acclaimedMovies = mapItems(data[mapIndices.acclaimed]);

    cache.set(cacheKey, { timestamp: Date.now(), data: responseData });
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching BFF home data:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch TMDB data' });
  }
});

router.get('/page', async (req, res) => {
  try {
    const listName = req.query.listName;
    const category = req.query.category || '';
    const page = req.query.page || '1';
    const cacheKey = `page_${listName}_${category}_${page}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
    }

    let isSeries = category === 'Serie TV' || category === 'Anime';
    let genreFilter = '';
    if (category === 'Animazione') genreFilter = '16';
    if (category === 'Anime') genreFilter = '16';

    const contentType = isSeries ? 'tv' : 'movie';
    const lang = 'language=it-IT';

    let today = new Date().toISOString().split('T')[0];
    let pastThreeMonths = new Date();
    pastThreeMonths.setMonth(pastThreeMonths.getMonth() - 3);
    let pastThreeMonthsDate = pastThreeMonths.toISOString().split('T')[0];

    let twoMonths = new Date();
    twoMonths.setMonth(twoMonths.getMonth() + 2);
    let twoMonthsDate = twoMonths.toISOString().split('T')[0];

    let future = new Date();
    future.setFullYear(future.getFullYear() + 5);
    let futureDate = future.toISOString().split('T')[0];

    let langFilter = '';
    if (category === 'Animazione') langFilter = '&without_original_language=ja';
    if (category === 'Anime') langFilter = '&with_original_language=ja';
    let genreFilterStr = genreFilter ? `&with_genres=${genreFilter}` : '';
    let discoverBase = `${TMDB_BASE_URL}/discover/${contentType}?${lang}${langFilter}`;
    let recentReleasesUrl = `${discoverBase}&sort_by=popularity.desc&${isSeries ? 'air_date.gte' : 'primary_release_date.gte'}=${twoMonthsDate}${genreFilterStr}`;

    let url = '';

    // Check if listName is a number (a specific Genre ID dynamically generated)
    if (!isNaN(Number(listName))) {
      url = `${discoverBase}&page=${page}&with_genres=${genreFilter ? genreFilter + ',' + listName : listName}`;
    } else if (typeof listName === 'string' && listName.startsWith('keyword_')) {
      const keywordId = listName.split('_')[1];
      url = `${discoverBase}&page=${page}&with_keywords=${keywordId}${genreFilterStr}`;
    } else {
      let voteCountThreshold = category === 'Anime' ? 200 : 3000;
      let dramaGenre = 18;
      let mysteryGenre = 9648;
      let fantasyGenre = isSeries ? 10765 : 14;
      let actionGenre = isSeries ? 10759 : 28;

      if (listName === 'trending') url = genreFilter || langFilter ? `${discoverBase}&sort_by=popularity.desc${genreFilterStr}&page=${page}` : `${TMDB_BASE_URL}/trending/${contentType}/week?${lang}&page=${page}`;
      else if (listName === 'topWatched') url = genreFilter || langFilter ? `${discoverBase}&sort_by=vote_average.desc&vote_count.gte=500${genreFilterStr}&page=${page}` : `${TMDB_BASE_URL}/${contentType}/top_rated?${lang}&page=${page}`;
      else if (listName === 'classics') url = `${discoverBase}&page=${page}&sort_by=vote_average.desc&vote_count.gte=${voteCountThreshold}&${isSeries ? 'first_air_date.lte' : 'primary_release_date.lte'}=2005-01-01${genreFilterStr}`;
      else if (listName === 'newReleases') url = `${recentReleasesUrl}&page=${page}`;
      else if (listName === 'episodes') {
        let strictUpcomingUrl = `${discoverBase}&sort_by=popularity.desc&${isSeries ? 'air_date.gte' : 'primary_release_date.gte'}=${today}&${isSeries ? 'air_date.lte' : 'primary_release_date.lte'}=${twoMonthsDate}${genreFilterStr}`;
        url = `${strictUpcomingUrl}&page=${page}`;
      }
      else if (listName === 'spotlight') url = `${discoverBase}&page=${page}&with_genres=${genreFilter ? genreFilter + ',' + dramaGenre : dramaGenre}`;
      else if (listName === 'hiddenGems') url = `${discoverBase}&page=${page}&with_genres=${genreFilter ? genreFilter + ',' + mysteryGenre : mysteryGenre}`;
      else if (listName === 'topPicks') url = `${discoverBase}&page=${page}&with_genres=${genreFilter ? genreFilter + ',' + fantasyGenre : fantasyGenre}`;
      else if (listName === 'action') url = `${discoverBase}&page=${page}&with_genres=${genreFilter ? genreFilter + ',' + actionGenre : actionGenre}`;
      else if (listName === 'acclaimed') url = `${discoverBase}&page=${page}&sort_by=vote_average.desc&vote_count.gte=${voteCountThreshold}${genreFilterStr}`;
      else url = `${discoverBase}&page=${page}${genreFilterStr}`;
    }

    const response = await axios.get(url, { headers: HEADERS });

    const excludeAnimation = category !== 'Animazione' && category !== 'Anime' && category !== 'Kids';
    const isAnimeCategory = category === 'Anime';
    const isAnimazioneCategory = category === 'Animazione';

    // Map items
    const foreignRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0400-\u04FF\u0E00-\u0E7F\u0600-\u06FF\u0900-\u097F]/;

    let items = response.data.results
      .filter(i => i.poster_path && i.backdrop_path && (listName === 'episodes' || listName === 'newReleases' || (i.overview && i.overview.trim().length > 10)))
      .filter(i => !(excludeAnimation && i.genre_ids && i.genre_ids.includes(16)))
      .filter(i => !isAnimeCategory || i.original_language === 'ja')
      .filter(i => !isAnimazioneCategory || i.original_language !== 'ja')
      .filter(i => !foreignRegex.test(i.title || i.name || ''))
      .map(item => mapMovieItem(item, isSeries));
    
    if (listName === 'episodes') {
      items.forEach(x => { x.bannerUrl = x.backdropUrl; x.seriesTitle = x.title; x.seasonEpisode = 'Novit\u00E0'; });
    }
    if (listName === 'classics') {
      items.forEach(x => { x.bannerUrl = x.backdropUrl; x.seriesTitle = x.title; });
    }
    if (listName === 'spotlight') {
      items = await enrichWithDetails(items);
    }
    cache.set(cacheKey, { timestamp: Date.now(), data: items });
    res.json(items);
  } catch (error) {
    console.error('Error fetching BFF page data:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch TMDB page' });
  }
});

router.get('/genre-list', async (req, res) => {
  try {
    const { category } = req.query;
    const isSeries = category === 'Serie TV' || category === 'Anime';
    const contentType = isSeries ? 'tv' : 'movie';
    const cacheKey = `genres_${category}`;

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
    }

    const response = await axios.get(`${TMDB_BASE_URL}/genre/${contentType}/list?language=it-IT`, { headers: HEADERS });
    let genres = response.data.genres || [];
    const excludeAnimation = category !== 'Animazione' && category !== 'Anime' && category !== 'Kids';
    if (excludeAnimation) {
      genres = genres.filter(g => g.id !== 16);
    }

    cache.set(cacheKey, { timestamp: Date.now(), data: genres });
    res.json(genres);
  } catch (error) {
    console.error('Error fetching genre list:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    const page = req.query.page || '1';

    if (!query) {
      return res.json([]);
    }

    const searchUrl = `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&page=${page}&language=it-IT`;
    const response = await axios.get(searchUrl, { headers: HEADERS });

    const foreignRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0400-\u04FF\u0E00-\u0E7F\u0600-\u06FF\u0900-\u097F]/;

    const results = response.data.results
      .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
      .filter(item => item.poster_path) // Require at least a poster
      .filter(item => {
        const title = item.title || item.name || '';
        return !foreignRegex.test(title);
      })
      .map(item => mapMovieItem(item, item.media_type === 'tv'));

    res.json(results);
  } catch (error) {
    console.error('Error in /search:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to search TMDB' });
  }
});

router.get('/detail/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    if (type !== 'movie' && type !== 'tv') {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const detailUrl = `${TMDB_BASE_URL}/${type}/${id}?append_to_response=credits,videos,images,recommendations,external_ids&include_image_language=it,en,null&language=it-IT`;
    const response = await axios.get(detailUrl, { headers: HEADERS });
    const data = response.data;
    const isSeries = type === 'tv';

    // Format money
    const formatMoney = (amount) => {
      if (!amount || amount === 0) return 'N/A';
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    // Format duration
    const formatDuration = (mins) => {
      if (!mins) return 'N/A';
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}h ${m}min` : `${m}min`;
    };

    const duration = isSeries
      ? (data.episode_run_time && data.episode_run_time.length > 0 ? formatDuration(data.episode_run_time[0]) : 'Varie')
      : formatDuration(data.runtime);

    const crew = data.credits && data.credits.crew ? data.credits.crew : [];
    const director = crew.find(c => c.job === 'Director')?.name || 'N/A';
    const music = crew.find(c => c.job === 'Original Music Composer' || c.job === 'Music')?.name || 'N/A';
    const producer = crew.filter(c => c.job === 'Producer').slice(0, 3).map(c => c.name).join(', ') || 'N/A';
    const writers = crew.filter(c => c.department === 'Writing').slice(0, 3).map(c => c.name).join(', ') || 'N/A';

    const cast = data.credits && data.credits.cast ? data.credits.cast.slice(0, 15).map(c => ({
      name: c.name,
      character: c.character,
      imageUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : 'https://via.placeholder.com/150x225?text=No+Image'
    })) : [];

    const productionCompanies = data.production_companies ? data.production_companies.map(c => c.name).join(', ') || 'N/A' : 'N/A';
    const releaseDate = isSeries ? data.first_air_date : data.release_date;

    let screenshots = data.images && data.images.backdrops ? data.images.backdrops.map(img => `https://image.tmdb.org/t/p/w1280${img.file_path}`) : [];
    if (screenshots.length > 0) {
      while (screenshots.length < 7) {
        screenshots.push(screenshots[screenshots.length % screenshots.length]); // Pad with existing ones
      }
    } else {
      screenshots = Array(7).fill('https://via.placeholder.com/1280x720?text=No+Screenshot');
    }

    const suggested = data.recommendations && data.recommendations.results
      ? data.recommendations.results.slice(0, 10).map(item => mapMovieItem(item, isSeries))
      : [];

    let omdbRatings = null;
    const imdbId = data.imdb_id || (data.external_ids ? data.external_ids.imdb_id : null);
    if (imdbId && process.env.OMDB_API_KEY) {
      try {
        const omdbUrl = `http://www.omdbapi.com/?i=${imdbId}&apikey=${process.env.OMDB_API_KEY}`;
        const omdbResponse = await axios.get(omdbUrl);
        if (omdbResponse.data && omdbResponse.data.Ratings) {
          omdbRatings = {};
          omdbResponse.data.Ratings.forEach(r => {
            if (r.Source === 'Internet Movie Database') omdbRatings.imdb = r.Value.split('/')[0];
            if (r.Source === 'Rotten Tomatoes') omdbRatings.rottenTomatoes = r.Value;
            if (r.Source === 'Metacritic') omdbRatings.metacritic = r.Value.split('/')[0] + '%';
          });
        } else if (omdbResponse.data && omdbResponse.data.imdbRating && omdbResponse.data.imdbRating !== 'N/A') {
          omdbRatings = { imdb: omdbResponse.data.imdbRating };
        }
      } catch (err) {
        console.error('Error fetching OMDb ratings:', err.message);
      }
    }
    // Add TMDB score as fallback for missing RT or Metacritic
    if (data.vote_average && data.vote_average > 0) {
      if (!omdbRatings) omdbRatings = {};
      omdbRatings.tmdb = (Math.round(data.vote_average * 10) / 10).toFixed(1);
    }

    const mappedData = {
      ...mapMovieItem(data, isSeries), // gets id, title, backdropUrl, etc.
      duration: duration,
      director: director,
      producer: producer,
      music: music,
      writers: writers,
      productionCompanies: productionCompanies,
      original_language: data.original_language,
      origin_country: data.origin_country || [],
      budget: formatMoney(data.budget),
      boxOffice: formatMoney(data.revenue),
      releaseDate: releaseDate || 'N/A',
      cast: cast,
      screenshots: screenshots,
      suggested: suggested,
      omdbRatings: omdbRatings,
      number_of_seasons: data.number_of_seasons,
      number_of_episodes: data.number_of_episodes,
      status: data.status
    };

    res.json(mappedData);
  } catch (error) {
    console.error('Error fetching details:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch details' });
  }
});

router.get('/recommendations/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const page = req.query.page || 1;
    if (type !== 'movie' && type !== 'tv') {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const detailUrl = `${TMDB_BASE_URL}/${type}/${id}/recommendations?language=it-IT&page=${page}`;
    const response = await axios.get(detailUrl, { headers: HEADERS });
    const isSeries = type === 'tv';

    const items = response.data.results
      .filter(item => item.poster_path) // Require at least a poster
      .map(item => mapMovieItem(item, isSeries));

    res.json(items);
  } catch (error) {
    console.error('Error fetching recommendations:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

router.get('/season/:id/:seasonNumber', async (req, res) => {
  try {
    const { id, seasonNumber } = req.params;
    const cacheKey = `season_${id}_${seasonNumber}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
    }

    const url = `${TMDB_BASE_URL}/tv/${id}/season/${seasonNumber}?language=it-IT`;
    const response = await axios.get(url, { headers: HEADERS });
    const episodes = (response.data.episodes || []).map(ep => ({
      id: ep.id,
      episodeNumber: ep.episode_number,
      title: ep.name || `Episodio ${ep.episode_number}`,
      duration: ep.runtime ? (ep.runtime >= 60 ? `${Math.floor(ep.runtime / 60)}h ${ep.runtime % 60}min` : `${ep.runtime}min`) : 'N/A',
      thumbnailUrl: ep.still_path
        ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
        : 'https://via.placeholder.com/500x281?text=No+Preview',
      synopsis: ep.overview || 'Nessuna descrizione disponibile.',
      airDate: ep.air_date || null,
      seasonNumber: ep.season_number
    }));

    cache.set(cacheKey, { timestamp: Date.now(), data: episodes });
    res.json(episodes);
  } catch (error) {
    console.error('Error fetching season episodes:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch season episodes' });
  }
});

module.exports = router;






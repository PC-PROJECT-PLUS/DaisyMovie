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
  const genres = res.genre_ids ? res.genre_ids.map(id => GENRE_MAP[id] || id.toString()) : [];

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
    ratingPercent: Math.round((res.vote_average || 0) * 10),
    watchCount: Math.floor((res.popularity || 0) * 100).toLocaleString('it-IT') + ' visualizzazioni'
  };
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

    const items = combinedResults
      .filter(i => i.poster_path && i.backdrop_path && i.overview && i.overview.trim().length > 10)
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
    future.setMonth(future.getMonth() + 6);
    let futureDate = future.toISOString().split('T')[0];

    let langFilter = '';
    if (category === 'Animazione') langFilter = '&without_original_language=ja';
    if (category === 'Anime') langFilter = '&with_original_language=ja';
    let genreFilterStr = genreFilter ? `&with_genres=${genreFilter}` : '';
    let discoverBase = `${TMDB_BASE_URL}/discover/${contentType}?${lang}${langFilter}`;

    let nowPlayingUrl = genreFilter || langFilter ?
      `${discoverBase}&sort_by=popularity.desc${genreFilterStr}&${isSeries ? 'air_date.gte' : 'primary_release_date.gte'}=${pastThreeMonthsDate}&${isSeries ? 'air_date.lte' : 'primary_release_date.lte'}=${today}` :
      `${TMDB_BASE_URL}/${contentType}/${isSeries ? 'on_the_air' : 'now_playing'}?${lang}`;

    let trendingUrl = genreFilter || langFilter ?
      `${discoverBase}&sort_by=popularity.desc${genreFilterStr}` :
      `${TMDB_BASE_URL}/trending/${contentType}/week?${lang}`;

    let topRatedUrl = genreFilter || langFilter ?
      `${discoverBase}&sort_by=vote_average.desc&vote_count.gte=500${genreFilterStr}` :
      `${TMDB_BASE_URL}/${contentType}/top_rated?${lang}`;

    let strictUpcomingUrl = `${discoverBase}&sort_by=popularity.desc&${isSeries ? 'first_air_date.gte' : 'primary_release_date.gte'}=${today}&${isSeries ? 'first_air_date.lte' : 'primary_release_date.lte'}=${futureDate}${genreFilterStr}`;
    let strictUpcomingMovieUrl = `${TMDB_BASE_URL}/discover/movie?${lang}${langFilter}&sort_by=popularity.desc&primary_release_date.gte=${today}&primary_release_date.lte=${futureDate}${genreFilterStr}`;
    let classicsUrl = `${discoverBase}&sort_by=vote_average.desc&vote_count.gte=3000&${isSeries ? 'first_air_date.lte' : 'primary_release_date.lte'}=2005-01-01${genreFilterStr}`;
    let recentReleasesUrl = `${discoverBase}&sort_by=popularity.desc&${isSeries ? 'air_date.gte' : 'primary_release_date.gte'}=${pastThreeMonthsDate}&${isSeries ? 'air_date.lte' : 'primary_release_date.lte'}=${today}${genreFilterStr}`;

    let spotlightUrl = `${discoverBase}&with_genres=${genreFilter ? genreFilter + ',18' : '18'}`;
    let hiddenGemsUrl = `${discoverBase}&with_genres=${genreFilter ? genreFilter + ',9648' : '9648'}`;
    let topPicksUrl = `${discoverBase}&with_genres=${genreFilter ? genreFilter + ',14' : '14'}`;
    let actionUrl = `${discoverBase}&with_genres=${genreFilter ? genreFilter + ',28' : '28'}`;
    let acclaimedUrl = `${discoverBase}&sort_by=vote_average.desc&vote_count.gte=3000${genreFilterStr}`;

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
      }
    }

    // Eseguiamo le chiamate simultaneamente
    const results = await Promise.all(requests);
    const data = results.map(r => r.data.results);

    const excludeAnimation = category !== 'Animazione' && category !== 'Anime' && category !== 'Kids';
    const isAnimeCategory = category === 'Anime';
    const isAnimazioneCategory = category === 'Animazione';

    // Mappiamo i risultati
    const mapItems = (arr, requireOverview = true) => arr
      .filter(i => i.poster_path && i.backdrop_path && (!requireOverview || (i.overview && i.overview.trim().length > 10)))
      .filter(i => !(excludeAnimation && i.genre_ids && i.genre_ids.includes(16)))
      .filter(i => !isAnimeCategory || i.original_language === 'ja')
      .filter(i => !isAnimazioneCategory || i.original_language !== 'ja')
      .slice(0, 15)
      .map(item => mapMovieItem(item, isSeries));

    const responseData = {};
    if (mapIndices.hero !== undefined) responseData.heroMovies = mapItems(data[mapIndices.hero]);
    if (mapIndices.trending !== undefined) responseData.trendingMovies = mapItems(data[mapIndices.trending]);
    if (mapIndices.episodes !== undefined) {
      let eps = mapItems(data[mapIndices.episodes], false);
      if (mapIndices.episodesAnimeMovie !== undefined) {
        let movieEps = mapItems(data[mapIndices.episodesAnimeMovie], false);
        eps = [...eps, ...movieEps];
      }
      responseData.latestEpisodes = eps.slice(0, 15).map(x => ({ ...x, bannerUrl: x.backdropUrl, seriesTitle: x.title, seasonEpisode: 'Novit\u00E0' }));
    }
    if (mapIndices.newReleases !== undefined) responseData.newReleasesMovies = mapItems(data[mapIndices.newReleases], false);
    if (mapIndices.topWatched !== undefined) responseData.topWatchedMovies = mapItems(data[mapIndices.topWatched]);
    if (mapIndices.spotlight !== undefined) responseData.spotlightMovies = mapItems(data[mapIndices.spotlight]).map(x => ({ ...x, duration: '1h 45m', matchScore: '95% match' }));
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

    let langFilter = '';
    if (category === 'Animazione') langFilter = '&without_original_language=ja';
    if (category === 'Anime') langFilter = '&with_original_language=ja';
    let genreFilterStr = genreFilter ? `&with_genres=${genreFilter}` : '';
    let discoverBase = `${TMDB_BASE_URL}/discover/${contentType}?${lang}${langFilter}`;

    let recentReleasesUrl = `${discoverBase}&sort_by=popularity.desc&${isSeries ? 'air_date.gte' : 'primary_release_date.gte'}=${pastThreeMonthsDate}&${isSeries ? 'air_date.lte' : 'primary_release_date.lte'}=${today}${genreFilterStr}`;

    let url = '';

    // Check if listName is a number (a specific Genre ID dynamically generated)
    if (!isNaN(Number(listName))) {
      url = `${discoverBase}&page=${page}&with_genres=${genreFilter ? genreFilter + ',' + listName : listName}`;
    } else {
      if (listName === 'trending') url = genreFilter || langFilter ? `${discoverBase}&sort_by=popularity.desc${genreFilterStr}&page=${page}` : `${TMDB_BASE_URL}/trending/${contentType}/week?${lang}&page=${page}`;
      else if (listName === 'topWatched') url = genreFilter || langFilter ? `${discoverBase}&sort_by=vote_average.desc&vote_count.gte=500${genreFilterStr}&page=${page}` : `${TMDB_BASE_URL}/${contentType}/top_rated?${lang}&page=${page}`;
      else if (listName === 'classics') url = `${discoverBase}&page=${page}&sort_by=vote_average.desc&vote_count.gte=3000&${isSeries ? 'first_air_date.lte' : 'primary_release_date.lte'}=2005-01-01${genreFilterStr}`;
      else if (listName === 'newReleases') url = `${recentReleasesUrl}&page=${page}`;
      else if (listName === 'spotlight') url = `${discoverBase}&page=${page}&with_genres=${genreFilter ? genreFilter + ',18' : '18'}`;
      else if (listName === 'hiddenGems') url = `${discoverBase}&page=${page}&with_genres=${genreFilter ? genreFilter + ',9648' : '9648'}`;
      else if (listName === 'topPicks') url = `${discoverBase}&page=${page}&with_genres=${genreFilter ? genreFilter + ',14' : '14'}`;
      else if (listName === 'action') url = `${discoverBase}&page=${page}&with_genres=${genreFilter ? genreFilter + ',28' : '28'}`;
      else if (listName === 'acclaimed') url = `${discoverBase}&page=${page}&sort_by=vote_average.desc&vote_count.gte=3000${genreFilterStr}`;
      else url = `${discoverBase}&page=${page}${genreFilterStr}`;
    }

    const response = await axios.get(url, { headers: HEADERS });

    const excludeAnimation = category !== 'Animazione' && category !== 'Anime' && category !== 'Kids';
    const isAnimeCategory = category === 'Anime';
    const isAnimazioneCategory = category === 'Animazione';

    // Map items
    const items = response.data.results
      .filter(i => i.poster_path && i.backdrop_path)
      .filter(i => !(excludeAnimation && i.genre_ids && i.genre_ids.includes(16)))
      .filter(i => !isAnimeCategory || i.original_language === 'ja')
      .filter(i => !isAnimazioneCategory || i.original_language !== 'ja')
      .map(item => mapMovieItem(item, isSeries));
    if (listName === 'classics') {
      items.forEach(x => { x.bannerUrl = x.backdropUrl; x.seriesTitle = x.title; });
    }
    if (listName === 'spotlight') {
      items.forEach(x => { x.duration = '1h 45m'; x.matchScore = '95% match'; });
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

module.exports = router;






import 'package:flutter/material.dart';
import 'package:daisy_movie_app/screens/mobile/search_mobile.dart';
import 'package:daisy_movie_app/screens/mobile/detail_mobile.dart';
import 'dart:ui';

class HomeMobile extends StatefulWidget {
  const HomeMobile({super.key});

  @override
  State<HomeMobile> createState() => _HomeMobileState();
}

// Stato globale per il tab corrente (permette anche alle altre pagine di navigare)
final ValueNotifier<int> appTabIndex = ValueNotifier<int>(0);

// Stato globale per il film attualmente visualizzato nel dettaglio
final ValueNotifier<Map<String, dynamic>?> appSelectedMovie = ValueNotifier(null);

class _HomeMobileState extends State<HomeMobile> {
  @override
  void initState() {
    super.initState();
    appTabIndex.addListener(() {
      if (mounted) setState(() {});
    });
    appSelectedMovie.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    // Non facciamo dispose perché è globale
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentIndex = appTabIndex.value;
    return PopScope(
      canPop: appSelectedMovie.value == null,
      onPopInvokedWithResult: (bool didPop, Object? result) {
        if (didPop) return;
        // Se non abbiamo poppato (appSelectedMovie non è null), lo settiamo a null per chiudere il dettaglio
        appSelectedMovie.value = null;
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF0F0F1A),
        body: Stack(
          children: [
          // Gestore di pagine con animazioni fluide e perfette
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            transitionBuilder: (Widget child, Animation<double> animation) {
              // Creiamo un senso spaziale: la Search (a destra) e la Home (a sinistra)
              // Se andiamo verso la Search, scivola da destra (+0.02).
              // Se torniamo alla Home, scivola da sinistra (-0.02).
              final isSearchPage = child is SearchMobile;

              return FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: Offset(isSearchPage ? 0.02 : -0.02, 0.0), 
                    end: Offset.zero,
                  ).animate(animation),
                  child: child,
                ),
              );
            },
            child: appSelectedMovie.value != null
                ? DetailMobile(
                    item: appSelectedMovie.value!,
                    heroTag: 'detail_hero',
                  )
                : currentIndex == 0 
                    ? _buildHomeContent() 
                    : currentIndex == 1 
                        ? const SearchMobile() 
                        : const Center(child: Text('Coming Soon', style: TextStyle(color: Colors.white))),
          ),
          // Navbar fluttuante in vetro (fissa sopra tutto)
          GlassBottomNavbar(
            currentIndex: currentIndex,
            onTap: (index) {
              appTabIndex.value = index;
              // Se siamo nella pagina dettaglio, la chiudiamo per mostrare il tab richiesto
              appSelectedMovie.value = null;
            },
          ),
        ],
      ),
    ),
  );
}

  // Il contenuto della Home originale
  Widget _buildHomeContent() {
    return SingleChildScrollView(
      key: const ValueKey('home_content'), // Importante per l'AnimatedSwitcher
      physics: const ClampingScrollPhysics(),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 110.0), // Spazio ridotto per la navbar (con un po' di respiro)
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const HeroSliderWidget(),
            const SizedBox(height: 24),
            _buildSectionHeader('Continua a guardare'),
            const SizedBox(height: 16),
            const ContinueWatchingSlider(),
            const SizedBox(height: 32),

            _buildSectionHeader('In tendenza'),
            const SizedBox(height: 16),
            const StandardMovieSlider(), // Tendenza
            const SizedBox(height: 32),

            _buildSectionHeader('Ultime uscite'),
            const SizedBox(height: 16),
            const EpisodesSlider(), // Episodi
            const SizedBox(height: 32),

            _buildSectionHeader('Nuove uscite'),
            const SizedBox(height: 16),
            const StandardMovieSlider(), // Nuove uscite
            const SizedBox(height: 32),

            _buildSectionHeader('Classifica'),
            const SizedBox(height: 16),
            const ChartSlider(), // Classifica
            const SizedBox(height: 32),

            _buildSectionHeader('Acclamati dalla critica'),
            const SizedBox(height: 16),
            const StandardMovieSlider(), // Acclamati
            const SizedBox(height: 32),

            _buildSectionHeader('In primo piano'),
            const SizedBox(height: 16),
            const SpotlightSlider(), // Primo piano
            const SizedBox(height: 32),

            _buildSectionHeader('Grandi Classici'),
            const SizedBox(height: 16),
            const StandardMovieSlider(), // Classici
            const SizedBox(height: 32),

            _buildSectionHeader('Perle nascoste'),
            const SizedBox(height: 16),
            const StandardMovieSlider(), // Perle nascoste
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Text(
        title,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------
// HERO SLIDER
// ---------------------------------------------------------
class HeroSliderWidget extends StatefulWidget {
  const HeroSliderWidget({super.key});

  @override
  State<HeroSliderWidget> createState() => _HeroSliderWidgetState();
}

class _HeroSliderWidgetState extends State<HeroSliderWidget> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, String>> _heroMovies = [
    {
      'title': 'Avatar : The Way of Water',
      'image': 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=800&q=80',
      'badge': 'Movie',
      'meta': '2023 • Sci-fi, Action • 3h20m',
    },
    {
      'title': 'Shōgun',
      'image': 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=800&q=80',
      'badge': 'Series',
      'meta': '2024 • Drama, History • 10 Eps',
    },
    {
      'title': 'Dune: Part Two',
      'image': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
      'badge': 'Movie',
      'meta': '2024 • Sci-fi, Adventure • 2h46m',
    },
    {
      'title': 'The Last of Us',
      'image': 'https://images.unsplash.com/photo-1605808383803-b01ef0f3244e?auto=format&fit=crop&w=800&q=80',
      'badge': 'Series',
      'meta': '2023 • Drama, Sci-Fi • 9 Eps',
    }
  ];

  @override
  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    return SizedBox(
      height: screenHeight * 0.75,
      child: Stack(
        children: [
          // 1. BACKGROUND IMAGES (Fixed in place, seamless cross-fade)
          ClipRect(
            child: AnimatedBuilder(
              animation: _pageController,
              builder: (context, child) {
                double page = _currentPage.toDouble();
                if (_pageController.hasClients && _pageController.position.haveDimensions) {
                  page = _pageController.page ?? _currentPage.toDouble();
                }
                return Stack(
                  fit: StackFit.expand,
                  children: List.generate(_heroMovies.length, (index) {
                    double distance = (page - index).abs();
                    double opacity = (1 - distance).clamp(0.0, 1.0);
                    
                    // Leggerissimo zoom in avanti per l'immagine che esce
                    double scale = 1.0 + (distance * 0.1);

                    if (opacity == 0.0) return const SizedBox.shrink();

                    return Opacity(
                      opacity: opacity,
                      child: Transform.scale(
                        scale: scale,
                        child: Image.network(
                          _heroMovies[index]['image']!,
                          fit: BoxFit.cover,
                          alignment: Alignment.topCenter,
                          errorBuilder: (context, error, stackTrace) => Container(
                            color: const Color(0xFF1E1E2C),
                            child: const Center(child: Icon(Icons.broken_image, color: Colors.white54)),
                          ),
                        ),
                      ),
                    );
                  }),
                );
              },
            ),
          ),

          // 2. GRADIENT OVERLAY (Static, covers the background)
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Color(0x000F0F1A),
                  Color(0xBB0F0F1A),
                  Color(0xFF0F0F1A),
                ],
                stops: [0.0, 0.4, 0.75, 1.0],
              ),
            ),
          ),

          // 3. PAGEVIEW CONTENT (Text, badges, buttons - swiping natively)
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() {
                _currentPage = index;
              });
            },
            physics: const ClampingScrollPhysics(),
            itemCount: _heroMovies.length,
            itemBuilder: (context, index) {
              final movie = _heroMovies[index];
              return GestureDetector(
                behavior: HitTestBehavior.translucent,
                onTapUp: (details) {
                  final screenWidth = MediaQuery.of(context).size.width;
                  if (details.globalPosition.dx < screenWidth / 2) {
                    if (_currentPage > 0) {
                      _pageController.previousPage(duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
                    }
                  } else {
                    if (_currentPage < _heroMovies.length - 1) {
                      _pageController.nextPage(duration: const Duration(milliseconds: 400), curve: Curves.easeInOut);
                    }
                  }
                },
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                  Positioned(
                    left: 24,
                    right: 24,
                    bottom: 40,
                    child: AnimatedBuilder(
                      animation: _pageController,
                      builder: (context, child) {
                        double pageOffset = 0.0;
                        if (_pageController.hasClients && _pageController.position.haveDimensions) {
                          pageOffset = _pageController.page! - index;
                        } else {
                          pageOffset = (_currentPage - index).toDouble();
                        }
                        // Il testo scivola via lateralmente più velocemente del normale swipe
                        return Transform.translate(
                          offset: Offset(pageOffset * 50, 0),
                          child: Opacity(
                            opacity: (1 - (pageOffset.abs() * 1.5)).clamp(0.0, 1.0),
                            child: child,
                          ),
                        );
                      },
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          DaisyGlassContainer(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            borderRadius: 20,
                            child: Text(
                              movie['badge']!,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      movie['title']!,
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 28,
                                        fontWeight: FontWeight.bold,
                                        height: 1.2,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      movie['meta']!,
                                      style: TextStyle(
                                        color: Colors.white.withValues(alpha: 0.7),
                                        fontSize: 13,
                                        fontWeight: FontWeight.w400,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),
                              // Glass Play Button
                              GestureDetector(
                                onTap: () {}, // Ferma la propagazione del tap
                                child: DaisyGlassContainer(
                                  width: 50,
                                  height: 50,
                                  shape: BoxShape.circle,
                                  child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 28),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              );
            },
          ),
          // Top Header (Non fisso, scorre con la pagina)
          Positioned(
            top: MediaQuery.of(context).padding.top + 16,
            left: 24,
            right: 24,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Hi, Jammie',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                DaisyGlassContainer(
                  width: 40,
                  height: 40,
                  shape: BoxShape.circle,
                  child: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 22),
                ),
              ],
            ),
          ),

          // Line Indicators
          Positioned(
            bottom: 16,
            left: 24,
            child: Row(
              children: List.generate(
                _heroMovies.length,
                (index) => AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  margin: const EdgeInsets.only(right: 6),
                  height: 4,
                  width: _currentPage == index ? 24 : 12,
                  decoration: BoxDecoration(
                    color: _currentPage == index ? Colors.white : Colors.white.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------
// CONTINUE WATCHING SLIDER
// ---------------------------------------------------------
class ContinueWatchingSlider extends StatelessWidget {
  const ContinueWatchingSlider({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 120,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        scrollDirection: Axis.horizontal,
        physics: const ClampingScrollPhysics(),
        itemCount: 3,
        itemBuilder: (context, index) {
          return Container(
            width: 280,
            margin: const EdgeInsets.only(right: 16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E1E2C),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                // Thumbnail
                ClipRRect(
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(20),
                    bottomLeft: Radius.circular(20),
                  ),
                  child: SizedBox(
                    width: 110,
                    height: double.infinity,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.network(
                          'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            color: const Color(0xFF2A2A3C),
                            child: const Center(child: Icon(Icons.broken_image, color: Colors.white54)),
                          ),
                        ),
                        Center(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(20),
                            child: BackdropFilter(
                              filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
                              child: Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.play_arrow_rounded,
                                  color: Colors.white,
                                  size: 24,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                // Details
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(
                          height: 34, // Ensures exactly 2 lines height
                          child: Text(
                            'Inside out Special Edition Moment with a very very long title that spans multiple lines',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              height: 1.2,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Icon(Icons.videocam_outlined, color: Colors.white.withValues(alpha: 0.6), size: 14),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Eps 5 of 18 - Director\'s cut extended version',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.6),
                                  fontSize: 12,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        // Progress Bar
                        Stack(
                          children: [
                            Container(
                              height: 4,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                            Container(
                              height: 4,
                              width: 60, // Mock progress
                              decoration: BoxDecoration(
                                color: const Color(0xFF6C63FF), // Purple accent from image
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                          ],
                        )
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------
// STANDARD MOVIE SLIDER
// ---------------------------------------------------------
class StandardMovieSlider extends StatelessWidget {
  const StandardMovieSlider({super.key});

  final List<String> posters = const [
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1596727147705-611529d3e1bc?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1616530940355-351fabd9524b?auto=format&fit=crop&w=500&q=80',
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 200,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        scrollDirection: Axis.horizontal,
        physics: const ClampingScrollPhysics(),
        itemCount: posters.length,
        itemBuilder: (context, index) {
          return GestureDetector(
            onTap: () {
              appSelectedMovie.value = {
                'title': 'Movie Title ${index + 1}',
                'image': posters[index],
                'badge': index % 2 == 0 ? 'Movie' : 'Series',
                'meta': '2024 • Action',
              };
            },
            child: Container(
              width: 130,
              margin: const EdgeInsets.only(right: 16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  posters[index],
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: const Color(0xFF1E1E2C),
                    child: const Center(child: Icon(Icons.broken_image, color: Colors.white54)),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------
// EPISODES SLIDER (Ultime uscite)
// ---------------------------------------------------------
class EpisodesSlider extends StatelessWidget {
  const EpisodesSlider({super.key});

  final List<Map<String, String>> episodes = const [
    {
      'image': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
      'title': 'House of the Dragon',
      'ep': 'S2 E4 - The Red Dragon and the Gold'
    },
    {
      'image': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
      'title': 'The Boys',
      'ep': 'S4 E8 - Season Finale'
    },
    {
      'image': 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=600&q=80',
      'title': 'The Bear',
      'ep': 'S3 E10 - Tomorrow'
    },
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 160,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        scrollDirection: Axis.horizontal,
        physics: const ClampingScrollPhysics(),
        itemCount: episodes.length,
        itemBuilder: (context, index) {
          final ep = episodes[index];
          return Container(
            width: 280,
            margin: const EdgeInsets.only(right: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              image: DecorationImage(
                image: NetworkImage(ep['image']!),
                fit: BoxFit.cover,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.3),
                  blurRadius: 10,
                  offset: const Offset(0, 5),
                )
              ],
            ),
            child: Stack(
              children: [
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Colors.transparent, Colors.black.withValues(alpha: 0.8)],
                    ),
                  ),
                ),
                Positioned(
                  bottom: 12,
                  left: 16,
                  right: 16,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ep['title']!,
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        ep['ep']!,
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: DaisyGlassContainer(
                    shape: BoxShape.circle,
                    padding: const EdgeInsets.all(6),
                    child: const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------
// CHART SLIDER (Classifica Top 10)
// ---------------------------------------------------------
class ChartSlider extends StatelessWidget {
  const ChartSlider({super.key});

  final List<String> posters = const [
    'https://images.unsplash.com/photo-1596727147705-611529d3e1bc?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1616530940355-351fabd9524b?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=500&q=80',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 220,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10), // Padding per non tagliare i numeri
        clipBehavior: Clip.none, // Permette ai numeri di sbordare senza essere tagliati
        scrollDirection: Axis.horizontal,
        physics: const ClampingScrollPhysics(),
        itemCount: posters.length,
        itemBuilder: (context, index) {
          final int rank = index + 1;
          Color getRankColor() {
            if (rank == 1) return const Color(0xFFFFD700); // Oro
            if (rank == 2) return const Color(0xFFC0C0C0); // Argento
            if (rank == 3) return const Color(0xFFCD7F32); // Bronzo
            return Colors.white.withValues(alpha: 0.9);
          }
          final rankColor = getRankColor();

          return SizedBox(
            width: 170,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Positioned(
                  left: 40,
                  top: 10,
                  child: Container(
                    width: 130,
                    height: 190,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      image: DecorationImage(
                        image: NetworkImage(posters[index]),
                        fit: BoxFit.cover,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.4),
                          blurRadius: 15,
                          offset: const Offset(0, 8),
                        )
                      ],
                    ),
                  ),
                ),
                Positioned(
                  left: -15,
                  bottom: -15, // Alzato leggermente
                  child: Text(
                    '$rank',
                    style: TextStyle(
                      fontSize: 130, // Dimensione ottimizzata
                      fontWeight: FontWeight.w900,
                      height: 1.0,
                      foreground: Paint()
                        ..style = PaintingStyle.stroke
                        ..strokeWidth = 3
                        ..color = rankColor,
                    ),
                  ),
                ),
                Positioned(
                  left: -15,
                  bottom: -15,
                  child: Text(
                    '$rank',
                    style: TextStyle(
                      fontSize: 130,
                      fontWeight: FontWeight.w900,
                      height: 1.0,
                      color: const Color(0xFF0F0F1A).withValues(alpha: 0.7), // Blend background
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------
// SPOTLIGHT SLIDER (In primo piano)
// ---------------------------------------------------------
class SpotlightSlider extends StatelessWidget {
  const SpotlightSlider({super.key});

  final List<Map<String, String>> spotlights = const [
    {
      'image': 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=300&q=80',
      'title': 'Dune: Part Two',
      'synopsis': 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.',
    },
    {
      'image': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80',
      'title': 'Oppenheimer',
      'synopsis': 'The story of American scientist, J. Robert Oppenheimer, and his role in the development of the atomic bomb.',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 200,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        scrollDirection: Axis.horizontal,
        physics: const ClampingScrollPhysics(),
        itemCount: spotlights.length,
        itemBuilder: (context, index) {
          final spot = spotlights[index];
          return Container(
            width: 320,
            margin: const EdgeInsets.only(right: 20),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.03),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
            ),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), bottomLeft: Radius.circular(24)),
                  child: Image.network(
                    spot['image']!,
                    width: 130,
                    height: 200,
                    fit: BoxFit.cover,
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center, // Centrato verticalmente
                      children: [
                        Text(
                          spot['title']!,
                          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                          maxLines: 1, // Troncato a 1 riga
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          spot['synopsis']!,
                          style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 12),
                          maxLines: 4,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 12),
                        DaisyGlassContainer(
                          width: double.infinity, // Occupa tutto lo spazio
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          borderRadius: 50,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            )
                          ],
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center, // Centrato orizzontalmente
                            children: [
                              Icon(Icons.play_arrow_rounded, color: Colors.white, size: 18),
                              SizedBox(width: 4),
                              Text('Guarda', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------
// GLASS BOTTOM NAVBAR (Liquid Effect)
// ---------------------------------------------------------
class GlassBottomNavbar extends StatefulWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const GlassBottomNavbar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  State<GlassBottomNavbar> createState() => _GlassBottomNavbarState();
}

class _GlassBottomNavbarState extends State<GlassBottomNavbar> with SingleTickerProviderStateMixin {
  
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  void _onItemTapped(int index) {
    if (widget.currentIndex != index) {
      widget.onTap(index);
      _controller.forward().then((_) => _controller.reverse());
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final double screenWidth = MediaQuery.of(context).size.width;
    // Barra più compatta e proporzionata (al massimo 320px)
    final double navWidth = (screenWidth * 0.75).clamp(260.0, 320.0);
    const double navHeight = 65.0; // Più sottile e compatta
    
    return Positioned(
      bottom: 24, // Più vicina al fondo
      left: (screenWidth - navWidth) / 2,
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) => Transform.scale(
          scale: _scaleAnimation.value,
          child: child,
        ),
        child: DaisyGlassContainer(
          width: navWidth,
          height: navHeight,
          borderRadius: 50,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 32,
              offset: const Offset(0, 16),
            )
          ],
          child: LayoutBuilder(
                builder: (context, constraints) {
                  // Calcoliamo la larghezza di ogni "spazio" sulla base dello spazio INTERNO REALE (al netto dei bordi)
                  // Questo evita in assoluto il problema dell'overflow di 4 pixel!
                  final double itemWidth = constraints.maxWidth / 4;
                  
                  return Stack(
                    children: [
                      // Il Pallino Bianco (Effetto Liquido ottimizzato tramite Transform su GPU)
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 400),
                        curve: Curves.easeOutBack, // Curva liquida/elastica
                        transform: Matrix4.translationValues(
                          (widget.currentIndex * itemWidth) + (itemWidth / 2) - 24.5,
                          (navHeight - 49) / 2, // Centrato verticalmente
                          0,
                        ),
                        width: 49,
                        height: 49,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black12,
                              blurRadius: 10,
                              offset: Offset(0, 4),
                            )
                          ]
                        ),
                      ),
                      
                      // Le 4 Icone
                      Row(
                        children: [
                          _buildNavItem(Icons.home_filled, 0, itemWidth, navHeight),
                          _buildNavItem(Icons.explore_outlined, 1, itemWidth, navHeight),
                          _buildNavItem(Icons.favorite_border_rounded, 2, itemWidth, navHeight),
                          _buildNavItem(Icons.person_outline_rounded, 3, itemWidth, navHeight),
                        ],
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
    );
  }

  Widget _buildNavItem(IconData icon, int index, double itemWidth, double navHeight) {
    final isSelected = widget.currentIndex == index;
    return GestureDetector(
      onTap: () => _onItemTapped(index),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: itemWidth,
        height: navHeight,
        child: Center(
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            child: Icon(
              icon,
              size: 24, // Icone più compatte
              color: isSelected ? Colors.black : Colors.white.withValues(alpha: 0.8),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------
// DAISY GLASS CONTAINER (Shared Glass Effect)
// ---------------------------------------------------------
class DaisyGlassContainer extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final EdgeInsetsGeometry? padding;
  final double? width;
  final double? height;
  final BoxShape shape;
  final BoxBorder? border;
  final List<BoxShadow>? boxShadow;

  const DaisyGlassContainer({
    super.key,
    required this.child,
    this.borderRadius = 16,
    this.padding,
    this.width,
    this.height,
    this.shape = BoxShape.rectangle,
    this.border,
    this.boxShadow,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        boxShadow: boxShadow,
        borderRadius: shape == BoxShape.circle ? null : BorderRadius.circular(borderRadius),
        shape: shape,
      ),
      child: ClipRRect(
        borderRadius: shape == BoxShape.circle ? BorderRadius.circular(1000) : BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.compose(
            outer: const ColorFilter.matrix([
              1.4 + (-0.085), -0.286, -0.028, 0, 0,
              -0.085, 1.4 + (-0.286), -0.028, 0, 0,
              -0.085, -0.286, 1.4 + (-0.028), 0, 0,
              0, 0, 0, 1, 0,
            ]),
            inner: ImageFilter.blur(sigmaX: 25, sigmaY: 25),
          ),
          child: Container(
            width: width,
            height: height,
            padding: padding,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.08),
              borderRadius: shape == BoxShape.circle ? null : BorderRadius.circular(borderRadius),
              shape: shape,
              border: border,
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

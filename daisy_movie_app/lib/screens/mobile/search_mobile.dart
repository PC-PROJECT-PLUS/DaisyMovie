import 'package:flutter/material.dart';
import 'home_mobile.dart'; // Per riutilizzare DaisyGlassContainer

class SearchMobile extends StatefulWidget {
  const SearchMobile({super.key});

  @override
  State<SearchMobile> createState() => _SearchMobileState();
}

class _SearchMobileState extends State<SearchMobile> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  bool _isSearchFocused = false;

  @override
  void initState() {
    super.initState();
    _searchFocusNode.addListener(() {
      setState(() {
        _isSearchFocused = _searchFocusNode.hasFocus;
      });
    });
  }

  final List<Map<String, String>> _recentlyWatched = [
    {
      'title': 'Movie 1',
      'image': 'https://picsum.photos/id/1015/300/450',
    },
    {
      'title': 'Movie 2',
      'image': 'https://picsum.photos/id/1016/300/450',
    },
    {
      'title': 'Movie 3',
      'image': 'https://picsum.photos/id/1018/300/450',
    },
    {
      'title': 'Movie 4',
      'image': 'https://picsum.photos/id/1026/300/450',
    },
    {
      'title': 'Movie 5',
      'image': 'https://picsum.photos/id/1027/300/450',
    },
    {
      'title': 'Movie 6',
      'image': 'https://picsum.photos/id/1028/300/450',
    },
  ];

  final List<Map<String, String>> _recommended = [
    {
      'title': 'Avatar: The Way of Water',
      'year': '2023',
      'genre': 'Sci-fi, Action',
      'duration': '3h20m',
      'image': 'https://picsum.photos/id/1019/150/225',
    },
    {
      'title': 'Ada Apa Dengan Cinta',
      'year': '2002',
      'genre': 'Romance',
      'duration': '1h52m',
      'image': 'https://picsum.photos/id/1020/150/225',
    },
    {
      'title': 'Abigail',
      'year': '2024',
      'genre': 'Horror',
      'duration': '1h49m',
      'image': 'https://picsum.photos/id/1021/150/225',
    },
    {
      'title': 'Dune: Part Two',
      'year': '2024',
      'genre': 'Sci-fi, Adventure',
      'duration': '2h46m',
      'image': 'https://picsum.photos/id/1022/150/225',
    },
    {
      'title': 'Interstellar',
      'year': '2014',
      'genre': 'Sci-fi, Drama',
      'duration': '2h49m',
      'image': 'https://picsum.photos/id/1023/150/225',
    },
    {
      'title': 'The Dark Knight',
      'year': '2008',
      'genre': 'Action, Crime',
      'duration': '2h32m',
      'image': 'https://picsum.photos/id/1024/150/225',
    },
    {
      'title': 'Inception',
      'year': '2010',
      'genre': 'Sci-fi, Action',
      'duration': '2h28m',
      'image': 'https://picsum.photos/id/1025/150/225',
    },
  ];

  final List<String> _dummySearchHistory = [
    'drawing love',
    'kulosa',
    'get busy',
    'addiction slowed',
    'split',
    'in the pool',
    'paparazzi dubstep',
    'sunflower',
    'matrix soundtrack',
    'interstellar ost',
    'avatar the way of water',
    'dune part two theme',
    'the dark knight rises',
    'chill lo-fi beats',
    'synthwave vibes',
    'cyberpunk 2077 music',
  ];

  @override
  void dispose() {
    _searchFocusNode.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool isIOS = Theme.of(context).platform == TargetPlatform.iOS;
    // Padding dinamico per la search bar
    final topPadding = MediaQuery.of(context).padding.top + (isIOS ? 12.0 : 8.0);
    final double screenWidth = MediaQuery.of(context).size.width;
    final double navWidth = screenWidth - 48.0;
    final double itemWidth = navWidth / 5;

    return SizedBox.expand(
      child: Stack(
        children: [
          // 1. Contenuto Scrollabile
          SingleChildScrollView(
            physics: const ClampingScrollPhysics(), // Evita l'effetto rimbalzo che crea gap visivi
            // Padding top basato sull'altezza della search bar
            padding: EdgeInsets.only(bottom: 120.0, top: topPadding + 80.0),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 350),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              transitionBuilder: (Widget child, Animation<double> animation) {
                return FadeTransition(
                  opacity: animation,
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0.0, 0.05), // Leggero slide dal basso
                      end: Offset.zero,
                    ).animate(animation),
                    child: child,
                  ),
                );
              },
              child: _isSearchFocused
                  ? KeyedSubtree(
                      key: const ValueKey('search_history'),
                      child: _buildSearchHistoryPanel(),
                    )
                  : KeyedSubtree(
                      key: const ValueKey('search_default'),
                      child: _buildDefaultSearchContent(),
                    ),
            ),
        ),
        
        // 2. Barra di Ricerca Fissa in alto
        Positioned(
          top: topPadding,
          left: 24,
          right: 24,
          child: DaisyGlassContainer(
            height: 65, // Stessa altezza della navbar inferiore (65.0)
            borderRadius: 32.5, // Completamente arrotondato (pill shape) come la navbar (65/2)
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(32.5),
                color: Colors.white.withValues(alpha: _isSearchFocused ? 0.08 : 0.0),
                border: Border.all(
                  color: Colors.transparent,
                  width: 0,
                ),
              ),
              child: TextField(
                controller: _searchController,
                focusNode: _searchFocusNode,
                cursorColor: Colors.white, // Cursore bianco fisso
                textAlignVertical: TextAlignVertical.center,
                style: const TextStyle(color: Colors.white, fontSize: 16),
                decoration: InputDecoration(
                  hintText: 'Search',
                  isDense: true, // Aiuta col centraggio verticale
                  hintStyle: TextStyle(
                    color: Colors.white.withValues(alpha: _isSearchFocused ? 0.7 : 0.5),
                    fontSize: 16,
                  ),
                  prefixIcon: Padding(
                    padding: EdgeInsets.only(
                      left: (itemWidth / 2) - 12, // Centro esatto dell'icona a itemWidth / 2
                      right: 12.0, // Distanza ravvicinata ma non appiccicata col testo
                    ),
                    child: Icon(
                      Icons.search_rounded,
                      color: Colors.white.withValues(alpha: _isSearchFocused ? 1.0 : 0.7),
                      size: 24,
                    ),
                  ),
                  prefixIconConstraints: const BoxConstraints(
                    minWidth: 0,
                    minHeight: 65,
                  ),
                  suffixIcon: _isSearchFocused
                      ? Padding(
                          padding: EdgeInsets.only(right: (itemWidth / 2) - 20),
                          child: GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: () {
                              _searchController.clear();
                              _searchFocusNode.unfocus();
                            },
                            child: SizedBox(
                              width: 48,
                              height: 48,
                              child: Center(
                                child: Icon(
                                  Icons.close_rounded,
                                  color: Colors.white.withValues(alpha: 0.9),
                                  size: 22,
                                ),
                              ),
                            ),
                          ),
                        )
                      : null,
                  suffixIconConstraints: const BoxConstraints(
                    minWidth: 0,
                    minHeight: 65,
                  ),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                ),
              ),
            ),
          ),
        ),
      ],
    ),
    );
  }

  Widget _buildSearchHistoryPanel() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Cronologia delle ricerche',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF161616), // Sfondo scuro per il pannello
              borderRadius: BorderRadius.circular(24),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: _dummySearchHistory.length,
              separatorBuilder: (context, index) => Divider(
                height: 1,
                color: Colors.white.withValues(alpha: 0.05),
                indent: 16,
                endIndent: 16,
              ),
              itemBuilder: (context, index) {
                return InkWell(
                  onTap: () {},
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      children: [
                        // Icona Orologio (cerchio)
                        Container(
                          width: 40,
                          height: 40,
                          decoration: const BoxDecoration(
                            color: Color(0xFF282828), // Leggermente più chiaro dello sfondo
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.access_time_rounded,
                            color: Colors.white70,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 16),
                        // Testo della ricerca
                        Expanded(
                          child: Text(
                            _dummySearchHistory[index],
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                            ),
                          ),
                        ),
                        // Azioni (X e freccia)
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.close_rounded, color: Colors.white54, size: 20),
                              onPressed: () {},
                              constraints: const BoxConstraints(),
                              padding: const EdgeInsets.all(8),
                            ),
                            IconButton(
                              icon: const Icon(Icons.north_east_rounded, color: Colors.white54, size: 20),
                              onPressed: () {},
                              constraints: const BoxConstraints(),
                              padding: const EdgeInsets.all(8),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDefaultSearchContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Recently Watch
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 24.0),
          child: Text(
            'Recently Watch',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 160,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            physics: const ClampingScrollPhysics(), // Coerente con il resto
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            itemCount: _recentlyWatched.length,
            itemBuilder: (context, index) {
              final movie = _recentlyWatched[index];
              return Container(
                width: 110,
                margin: const EdgeInsets.only(right: 16),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  image: DecorationImage(
                    image: NetworkImage(movie['image']!),
                    fit: BoxFit.cover,
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 32),

        // Recommended
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 24.0),
          child: Text(
            'Recommended',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        const SizedBox(height: 16),
        ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          physics: const NeverScrollableScrollPhysics(),
          shrinkWrap: true,
          itemCount: _recommended.length,
          itemBuilder: (context, index) {
            final movie = _recommended[index];
            return Padding(
              padding: const EdgeInsets.only(bottom: 20.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Poster
                  Container(
                    width: 80,
                    height: 100,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      image: DecorationImage(
                        image: NetworkImage(movie['image']!),
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Badge
                        DaisyGlassContainer(
                          borderRadius: 12,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          child: const Text(
                            'Movie',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        // Title
                        Text(
                          movie['title']!,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        // Meta
                        Text(
                          '${movie['year']} • ${movie['genre']} • ${movie['duration']}',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.5),
                            fontSize: 12,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}


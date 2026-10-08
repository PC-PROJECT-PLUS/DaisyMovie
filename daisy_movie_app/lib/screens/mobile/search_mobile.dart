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

    return SizedBox.expand(
      child: Stack(
        children: [
          // 1. Contenuto Scrollabile
          SingleChildScrollView(
            physics: const ClampingScrollPhysics(), // Evita l'effetto rimbalzo che crea gap visivi
            // Padding top basato sull'altezza della search bar
            padding: EdgeInsets.only(bottom: 120.0, top: topPadding + 80.0),
            child: Column(
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
          ),
        ),
        
        // 2. Barra di Ricerca Fissa in alto
        Positioned(
          top: topPadding,
          left: 24,
          right: 24,
          child: DaisyGlassContainer(
            borderRadius: 16,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutCubic,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
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
                style: const TextStyle(color: Colors.white, fontSize: 16),
                decoration: InputDecoration(
                  hintText: 'Search',
                  hintStyle: TextStyle(
                    color: Colors.white.withValues(alpha: _isSearchFocused ? 0.7 : 0.5),
                    fontSize: 16,
                  ),
                  prefixIcon: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: Icon(
                      Icons.search_rounded,
                      color: Colors.white.withValues(alpha: _isSearchFocused ? 1.0 : 0.7),
                      size: 24,
                    ),
                  ),
                  prefixIconConstraints: const BoxConstraints(minWidth: 40),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(vertical: 18.0),
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

import 'dart:ui';

import 'package:flutter/material.dart';

import 'home_mobile.dart'; // Per DaisyGlassContainer e appSelectedMovie

class DetailMobile extends StatefulWidget {
  final Map<String, dynamic> item; // Film o serie tv
  final String heroTag; // Per animazioni (futuro)

  const DetailMobile({super.key, required this.item, required this.heroTag});

  @override
  State<DetailMobile> createState() => _DetailMobileState();
}

class _DetailMobileState extends State<DetailMobile> {
  Color? _primaryColor;
  int _selectedSeason = 1;

  final ValueNotifier<double> _topScrollFade = ValueNotifier(0.0);
  final ValueNotifier<double> _bottomScrollFade = ValueNotifier(1.0);

  @override
  void initState() {
    super.initState();
    // Reintrodotto il ritardo per dare priorità assoluta all'animazione della pagina
    Future.delayed(const Duration(milliseconds: 350), () {
      if (mounted) {
        _extractColor();
      }
    });
  }

  @override
  void dispose() {
    _topScrollFade.dispose();
    _bottomScrollFade.dispose();
    super.dispose();
  }

  Future<void> _extractColor() async {
    try {
      // Manteniamo ResizeImage perché è istantaneo, ma lo avviamo dopo il delay
      final scheme = await ColorScheme.fromImageProvider(
        provider: ResizeImage(NetworkImage(widget.item['image']!), width: 50),
      );
      if (mounted) {
        setState(() {
          _primaryColor = scheme.primary;
        });
      }
    } catch (e) {
      // Ignora errori di caricamento immagine
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final topSafeArea = MediaQuery.of(context).padding.top;

    // L'immagine deve occupare il 75% dello schermo (come HeroSlider)
    final imageHeight = screenHeight * 0.75;

    return Scaffold(
      backgroundColor: const Color(0xFF0F0F1A),
      body: Stack(
        children: [
          // Contenuto Scrollabile Principale (Immagine e Testi scorrono INSIEME)
          Positioned.fill(
            child: SingleChildScrollView(
              padding: EdgeInsets.zero,
              physics: const ClampingScrollPhysics(), // Niente bounce
              child: Stack(
                children: [
                  // 1. L'Immagine dietro a tutto (Scorre con la pagina perché è dentro SingleChildScrollView)
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    height: imageHeight,
                    child: ClipRect(
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          Image.network(
                            widget.item['image']?.toString().replaceAll(
                                  'w=500',
                                  'w=1200',
                                ) ??
                                'https://via.placeholder.com/400x600',
                            fit: BoxFit.cover,
                            alignment: Alignment.topCenter,
                          ),
                          // Gradiente e blur applicato ALL'IMMAGINE tramite sovrapposizione
                          ShaderMask(
                            shaderCallback: (bounds) {
                              return const LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [Colors.transparent, Colors.white],
                                stops: [0.3, 0.75], // Sfumatura inizia un po' prima per non far confondere il testo
                              ).createShader(bounds);
                            },
                            blendMode: BlendMode.dstIn,
                            child: ImageFiltered(
                              imageFilter: ImageFilter.blur(
                                sigmaX: 20.0,
                                sigmaY: 20.0,
                              ), // Blur più forte
                              child: Image.network(
                                widget.item['image']?.toString().replaceAll(
                                      'w=500',
                                      'w=1200',
                                    ) ??
                                    'https://via.placeholder.com/400x600',
                                fit: BoxFit.cover,
                                alignment: Alignment.topCenter,
                              ),
                            ),
                          ),
                          // Sfumatura colore nero
                          Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.transparent,
                                  Color(0xCC0F0F1A), // Sfondo semi-trasparente
                                  Color(0xFF0F0F1A), // Nero solido
                                  Color(0xFF0F0F1A), // Nero solido fino alla fine per coprire il bordo sgranato
                                ],
                                stops: [0.3, 0.65, 0.85, 1.0], // Diventa completamente nero al 85% dell'altezza
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // 2. Contenuto in colonna (che determina l'altezza totale per lo scroll)
                  Column(
                    children: [
                      // Spazio vuoto per far vedere l'immagine prima che inizi il testo (circa il 55% dell'altezza)
                      SizedBox(height: imageHeight * 0.55),

                      // Testi
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 24,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            // Titolo con adattamento dimensione
                            SizedBox(
                              width: double.infinity,
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                alignment: Alignment.center,
                                child: Text(
                                  widget.item['title'] ?? 'Unknown',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 42,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 1.2,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Metadata
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  widget.item['meta']?.split('•')[0].trim() ??
                                      '2024',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.7),
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                // Stelle
                                Row(
                                  children: List.generate(5, (index) {
                                    return Icon(
                                      index < 4 ? Icons.star : Icons.star_half,
                                      color: Colors.orangeAccent,
                                      size: 16,
                                    );
                                  }),
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  'Family', // Genere
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.7),
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  '1h 45m', // Durata
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.7),
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),

                            // Descrizione
                            Text(
                              'In the heart of the Great Barrier Reef, Marlin, a neurotic clownfish, embarks on a daring adventure to find his son Nemo...',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.7),
                                fontSize: 15,
                                height: 1.5,
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 32),

                            // Pulsante Play Now e icone
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                // 1. Trailer
                                DaisyGlassContainer(
                                  width: 48,
                                  height: 48,
                                  shape: BoxShape.circle,
                                  padding: EdgeInsets.zero,
                                  border: Border.all(
                                    color:
                                        _primaryColor ??
                                        Colors.white.withValues(alpha: 0.2),
                                    width: 1.5,
                                  ),
                                  child: Center(
                                    child: Icon(
                                      Icons.movie_outlined,
                                      color: _primaryColor ?? Colors.white,
                                      size: 24,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),

                                // 2. Play Now
                                Expanded(
                                  child: SizedBox(
                                    height: 48,
                                    child: AnimatedContainer(
                                      duration: const Duration(
                                        milliseconds: 500,
                                      ),
                                      child: ElevatedButton(
                                        onPressed: () {},
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor:
                                              _primaryColor ??
                                              const Color(0xFFF2C94C),
                                          elevation: 0,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              24,
                                            ),
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.center,
                                          children: [
                                            Icon(
                                              Icons.play_arrow_rounded,
                                              size: 26,
                                              color: _primaryColor != null
                                                  ? (_primaryColor!
                                                                .computeLuminance() >
                                                            0.5
                                                        ? Colors.black
                                                        : Colors.white)
                                                  : Colors.black,
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              'Play Now',
                                              style: TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                                color: _primaryColor != null
                                                    ? (_primaryColor!
                                                                  .computeLuminance() >
                                                              0.5
                                                          ? Colors.black
                                                          : Colors.white)
                                                    : Colors.black,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),

                                // 3. Preferiti
                                DaisyGlassContainer(
                                  width: 48,
                                  height: 48,
                                  shape: BoxShape.circle,
                                  padding: EdgeInsets.zero,
                                  border: Border.all(
                                    color:
                                        _primaryColor ??
                                        Colors.white.withValues(alpha: 0.2),
                                    width: 1.5,
                                  ),
                                  child: Center(
                                    child: Padding(
                                      padding: const EdgeInsets.only(
                                        top: 2.0,
                                      ), // Allineamento ottico per il cuore
                                      child: Icon(
                                        Icons.favorite_border_rounded,
                                        color: _primaryColor ?? Colors.white,
                                        size: 22,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),

                            // Spazio prima delle nuove sezioni
                            const SizedBox(height: 24),
                          ],
                        ),
                      ),

                      // 3. PIÙ INFORMAZIONI
                      _buildSectionHeader('Più informazioni'),
                      const SizedBox(height: 16),
                      _buildInfoSection(),
                      const SizedBox(height: 32),

                      // SEZIONI CONDIZIONALI (Stagioni ed episodi per Serie TV)
                      if (widget.item['badge'] == 'Series') ...[
                        _buildSeasonsSection(),
                        const SizedBox(height: 32),
                      ],

                      // 4. CAST
                      _buildSectionHeader('Cast'),
                      const SizedBox(height: 16),
                      _buildCastSection(),
                      const SizedBox(height: 32),

                      // 5. SCREENSHOT
                      _buildSectionHeader('Screenshot'),
                      const SizedBox(height: 16),
                      _buildScreenshotsSection(),
                      const SizedBox(height: 32),

                      // 6. CONSIGLIATI
                      _buildSectionHeader('Consigliati per te'),
                      const SizedBox(height: 16),
                      const StandardMovieSlider(),

                      // Spazio extra per scorrere oltre la navbar (che è in basso)
                      const SizedBox(height: 120),
                    ],
                  ),
                  // Spazio rimosso per spostare l'icona nei Widget fissi
                ],
              ),
            ),
          ),

          // 3. Barra Superiore con pulsante Back FISSO (Fuori dallo ScrollView)
          Positioned(
            top: topSafeArea + 16,
            left: 24,
            child: AnimatedScaleButton(
              onTap: () {
                // Torna indietro gestendo lo stato globale per l'animazione corretta
                if (appSelectedMovie.value != null) {
                  appSelectedMovie.value = null;
                } else {
                  Navigator.of(context).pop();
                }
              },
              child: DaisyGlassContainer(
                width: 40,
                height: 40,
                shape: BoxShape.circle,
                padding: EdgeInsets.zero,
                child: const Center(
                  child: Icon(
                    Icons.arrow_back_ios_new_rounded,
                    color: Colors.white,
                    size: 16,
                  ),
                ),
              ),
            ),
          ),

          // 4. Icona Notifiche FISSA (Fuori dallo ScrollView, in alto a destra)
          Positioned(
            top: topSafeArea + 16,
            right: 24,
            child: AnimatedScaleButton(
              onTap: () {},
              child: DaisyGlassContainer(
                width: 40,
                height: 40,
                shape: BoxShape.circle,
                padding: EdgeInsets.zero,
                child: const Center(
                  child: Icon(
                    Icons.notifications_none_rounded,
                    color: Colors.white,
                    size: 22,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- WIDGET HELPER PER LE SEZIONI ---

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 19,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.3,
          ),
        ),
      ),
    );
  }

  Widget _buildInfoSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: SizedBox(
        width: double.infinity,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildInfoLine('Data di uscita:', '1 Marzo 2024'),
            _buildInfoLine('Regista:', 'Denis Villeneuve'),
            _buildInfoLine(
              'Produttori:',
              'Mary Parent, Cale Boyter, Denis Villeneuve',
            ),
            _buildInfoLine('Musiche:', 'Hans Zimmer'),
            _buildInfoLine('Case di produzione:', 'Legendary Pictures'),
            _buildInfoLine('Distribuito da:', 'Warner Bros. Pictures'),
            _buildInfoLine('Budget:', '\$190M'),
            _buildInfoLine('Botteghino:', '\$711.8M'),
            _buildInfoLine('Lingue:', 'Inglese, Chakobsa'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: RichText(
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        text: TextSpan(
          children: [
            TextSpan(
              text: '$label ',
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.6),
                fontSize: 14,
                fontWeight: FontWeight.w400,
              ),
            ),
            TextSpan(
              text: value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCastSection() {
    final List<Map<String, String>> mockCast = [
      {
        'name': 'Zendaya',
        'role': 'Chani',
        'img': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
      },
      {
        'name': 'Timothée Chalamet',
        'role': 'Paul Atreides',
        'img': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
      },
      {
        'name': 'Rebecca Ferguson',
        'role': 'Lady Jessica',
        'img': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      },
      {
        'name': 'Oscar Isaac',
        'role': 'Duke Leto',
        'img': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      },
      {
        'name': 'Jason Momoa',
        'role': 'Duncan Idaho',
        'img': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
      },
      {
        'name': 'Javier Bardem',
        'role': 'Stilgar',
        'img': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
      },
      {
        'name': 'Josh Brolin',
        'role': 'Gurney Halleck',
        'img': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      },
      {
        'name': 'Stellan Skarsgård',
        'role': 'Baron Harkonnen',
        'img': 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=150&q=80',
      },
      {
        'name': 'Dave Bautista',
        'role': 'Glossu Rabban',
        'img': 'https://images.unsplash.com/photo-1520223297779-95bbd1ea79b7?auto=format&fit=crop&w=150&q=80',
      },
      {
        'name': 'Florence Pugh',
        'role': 'Princess Irulan',
        'img': 'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=150&q=80',
      },
    ];

    return SizedBox(
      height: 140, // Spazio per Avatar + Nome + Ruolo
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const ClampingScrollPhysics(),
        clipBehavior: Clip.none,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        itemCount: mockCast.length,
        itemBuilder: (context, index) {
          final actor = mockCast[index];
          return AnimatedScaleButton(
            onTap: () {},
            child: Container(
              width: 76, // Fissiamo la larghezza in modo che coincida col diametro dell'avatar
              margin: const EdgeInsets.only(right: 20),
              child: Column(
                children: [
                  ClipOval(
                    child: Image.network(
                      actor['img']!,
                      width: 76,
                      height: 76,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          width: 76,
                          height: 76,
                          color: Colors.white.withValues(alpha: 0.1),
                          child: const Icon(
                            Icons.person,
                            color: Colors.white54,
                            size: 30,
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    actor['name']!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    actor['role']!,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.6),
                      fontSize: 11,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildScreenshotsSection() {
    final List<String> imgs = [
      'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1534809027769-b00d750a6bac?auto=format&fit=crop&w=400&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&w=800&q=80',
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Column(
        children: [
          // Prima riga: 2 immagini larghe
          Row(
            children: [
              Expanded(child: _buildGridImage(imgs[0], 110)),
              const SizedBox(width: 12),
              Expanded(child: _buildGridImage(imgs[1], 110)),
            ],
          ),
          const SizedBox(height: 12),
          // Seconda riga: Verticale + Larga + Verticale
          Row(
            children: [
              Expanded(flex: 1, child: _buildGridImage(imgs[2], 180)),
              const SizedBox(width: 12),
              Expanded(flex: 2, child: _buildGridImage(imgs[3], 180)),
              const SizedBox(width: 12),
              Expanded(flex: 1, child: _buildGridImage(imgs[4], 180)),
            ],
          ),
          const SizedBox(height: 12),
          // Terza riga: 2 immagini larghe
          Row(
            children: [
              Expanded(child: _buildGridImage(imgs[5], 110)),
              const SizedBox(width: 12),
              Expanded(child: _buildGridImage(imgs[6], 110)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildGridImage(String url, double height) {
    return AnimatedScaleButton(
      onTap: () {},
      child: Container(
        height: height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.25),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Image.network(
            url,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) {
              return Container(
                color: Colors.white.withValues(alpha: 0.1),
                child: const Center(
                  child: Icon(Icons.broken_image, color: Colors.white54),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildSeasonsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Slider delle Stagioni
        SizedBox(
          height: 56,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            physics: const ClampingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 24),
            itemCount: 8,
            itemBuilder: (context, index) {
              final season = index + 1;
              final isSelected = _selectedSeason == season;
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedSeason = season;
                    // Resettiamo le ombre all'inizio quando cambiamo stagione
                    _topScrollFade.value = 0.0;
                    _bottomScrollFade.value = 1.0;
                  });
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  margin: const EdgeInsets.only(right: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? (_primaryColor ?? const Color(0xFF8B5CF6))
                        : Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Center(
                    child: Text(
                      '0$season',
                      style: TextStyle(
                        color: isSelected
                            ? (_primaryColor != null
                                  ? (_primaryColor!.computeLuminance() > 0.5
                                        ? Colors.black
                                        : Colors.white)
                                  : Colors.white)
                            : Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        const SizedBox(height: 24),
        _buildSectionHeader('Episodes'),
        const SizedBox(height: 16),

        // Pannello degli episodi scrollabile indipendente
        SizedBox(
          height: 280, // Ridotto per essere più compatto
          child: NotificationListener<ScrollNotification>(
            onNotification: (ScrollNotification notification) {
              final metrics = notification.metrics;
              if (metrics.axis == Axis.vertical) {
                final top = metrics.pixels > 10
                    ? 1.0
                    : (metrics.pixels / 10).clamp(0.0, 1.0);
                final remaining = metrics.maxScrollExtent - metrics.pixels;
                final bottom = remaining > 10
                    ? 1.0
                    : (remaining / 10).clamp(0.0, 1.0);
                if (top != _topScrollFade.value) _topScrollFade.value = top;
                if (bottom != _bottomScrollFade.value) {
                  _bottomScrollFade.value = bottom;
                }
              }
              return false;
            },
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 500),
              switchInCurve: Curves.easeOutBack,
              switchOutCurve: Curves.easeInCirc,
              transitionBuilder: (Widget child, Animation<double> animation) {
                // Usiamo AnimatedBuilder per l'opacità, così possiamo calcolare il valore matematicamente
                // e tagliare (clamp) a mano eventuali sforamenti dell'animazione (overshoot) senza crash.
                return AnimatedBuilder(
                  animation: animation,
                  builder: (context, child) {
                    // Garantiamo che 't' sia esattamente tra 0.0 e 1.0
                    final double t = animation.value.clamp(0.0, 1.0);
                    // Calcoliamo un ritardo del 50%: opacità è 0 fino a t=0.5, poi sale a 1.0
                    final double opacity = ((t - 0.5) * 2.0).clamp(0.0, 1.0);
                    
                    return Opacity(
                      opacity: opacity,
                      child: child,
                    );
                  },
                  child: SlideTransition(
                    position: Tween<Offset>(
                      begin: const Offset(0.0, 0.2), // Scorre dal basso
                      end: Offset.zero,
                    ).animate(animation),
                    child: ScaleTransition(
                      scale: Tween<double>(
                        begin: 0.95,
                        end: 1.0,
                      ).animate(animation),
                      child: child,
                    ),
                  ),
                );
              },
              child: ValueListenableBuilder<double>(
                key: ValueKey<int>(_selectedSeason),
                valueListenable: _topScrollFade,
                builder: (context, topVal, child) {
                  return ValueListenableBuilder<double>(
                    valueListenable: _bottomScrollFade,
                    builder: (context, bottomVal, innerChild) {
                      return ShaderMask(
                        shaderCallback: (Rect rect) {
                          return LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withValues(alpha: 1.0 - topVal),
                              Colors.black,
                              Colors.black,
                              Colors.black.withValues(alpha: 1.0 - bottomVal),
                            ],
                            stops: const [0.0, 0.05, 0.95, 1.0],
                          ).createShader(rect);
                        },
                        blendMode: BlendMode.dstIn,
                        child: innerChild,
                      );
                    },
                    child: ListView.builder(
                      physics: const ClampingScrollPhysics(), // Rimossa l'animazione di rimbalzo (bounce)
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 8,
                      ),
                      itemCount: 8,
                      itemBuilder: (context, index) {
                        return _buildEpisodeItem(index);
                      },
                    ),
                  );
                },
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEpisodeItem(int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Immagine episodio
          Container(
            width: 140,
            height: 85,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              image: const DecorationImage(
                image: NetworkImage(
                  'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=400&q=80',
                ),
                fit: BoxFit.cover,
              ),
            ),
            child: Center(
              child: DaisyGlassContainer(
                width: 36,
                height: 36,
                shape: BoxShape.circle,
                padding: EdgeInsets.zero,
                child: const Center(
                  child: Icon(
                    Icons.play_arrow_rounded,
                    color: Colors.white,
                    size: 22,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 16),
          // Testo e info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        'Episode ${index + 1}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  '60 Minutes',
                  style: TextStyle(color: Colors.white54, fontSize: 13),
                ),
                const SizedBox(height: 8),
                const Text(
                  'A short description of this episode that takes exactly two lines to fit nicely.',
                  style: TextStyle(
                    color: Colors.white54,
                    fontSize: 12,
                    height: 1.3,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// --- WIDGET PER ANIMAZIONI TATTILI ---
class AnimatedScaleButton extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;

  const AnimatedScaleButton({
    super.key,
    required this.child,
    required this.onTap,
  });

  @override
  State<AnimatedScaleButton> createState() => _AnimatedScaleButtonState();
}

class _AnimatedScaleButtonState extends State<AnimatedScaleButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 0.94,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        widget.onTap();
      },
      onTapCancel: () => _controller.reverse(),
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) =>
            Transform.scale(scale: _scaleAnimation.value, child: child),
        child: widget.child,
      ),
    );
  }
}

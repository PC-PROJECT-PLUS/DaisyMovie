import 'package:flutter/material.dart';
import 'responsive_layout.dart';
import 'screens/mobile/home_mobile.dart';

void main() {
  runApp(const DaisyMovieApp());
}

class DaisyMovieApp extends StatelessWidget {
  const DaisyMovieApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DaisyMovie',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F0F1A), // Colore di base scuro per l'app
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFFF4081), // Accento rosa come sul sito web
          secondary: Color(0xFF00E5FF), // Accento ciano
        ),
      ),
      home: const MainScaffold(),
    );
  }
}

class MainScaffold extends StatelessWidget {
  const MainScaffold({super.key});

  @override
  Widget build(BuildContext context) {
    // Utilizziamo il nostro widget custom per decidere quale layout mostrare
    return ResponsiveLayout(
      mobileScaffold: const HomeMobile(),
      tabletScaffold: _buildTabletLayout(),
    );
  }



  // Questo è lo scheletro per il tablet (o schermi grandi)
  Widget _buildTabletLayout() {
    return Scaffold(
      body: Row(
        children: [
          // Barra di navigazione laterale per sfruttare lo spazio orizzontale
          NavigationRail(
            destinations: const [
              NavigationRailDestination(icon: Icon(Icons.home), label: Text('Home')),
              NavigationRailDestination(icon: Icon(Icons.search), label: Text('Cerca')),
              NavigationRailDestination(icon: Icon(Icons.settings), label: Text('Impostazioni')),
            ],
            selectedIndex: 0,
            onDestinationSelected: (int index) {},
            labelType: NavigationRailLabelType.all,
            backgroundColor: const Color(0xFF1A1A2E),
            unselectedIconTheme: const IconThemeData(color: Colors.white54),
            selectedIconTheme: const IconThemeData(color: Color(0xFFFF4081)),
          ),
          const VerticalDivider(thickness: 1, width: 1),
          // Contenuto principale del tablet
          Expanded(
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Icon(Icons.tablet_mac, size: 100, color: Colors.white54),
                  SizedBox(height: 20),
                  Text('Layout Ottimizzato per Tablet', style: TextStyle(fontSize: 24)),
                  SizedBox(height: 10),
                  Text('Qui mostreremo griglie con più colonne', style: TextStyle(color: Colors.grey)),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}

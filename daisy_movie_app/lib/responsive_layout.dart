import 'package:flutter/material.dart';

class ResponsiveLayout extends StatelessWidget {
  final Widget mobileScaffold;
  final Widget tabletScaffold;

  const ResponsiveLayout({
    super.key,
    required this.mobileScaffold,
    required this.tabletScaffold,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Se la larghezza massima è inferiore a 768, usiamo il layout mobile
        // Altrimenti usiamo il layout tablet (o web/desktop)
        if (constraints.maxWidth < 768) {
          return mobileScaffold;
        } else {
          return tabletScaffold;
        }
      },
    );
  }
}

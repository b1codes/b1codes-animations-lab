import 'package:flutter/material.dart';
import 'package:b1codes_loaders/b1codes_loaders.dart';

void main() {
  runApp(const B1CodesLoadersExampleApp());
}

class B1CodesLoadersExampleApp extends StatelessWidget {
  const B1CodesLoadersExampleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'b1codes_loaders Example',
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0D0F12),
      ),
      home: const LoaderDemoScreen(),
    );
  }
}

class LoaderDemoScreen extends StatefulWidget {
  const LoaderDemoScreen({super.key});

  @override
  State<LoaderDemoScreen> createState() => _LoaderDemoScreenState();
}

class _LoaderDemoScreenState extends State<LoaderDemoScreen> {
  String _selectedVariant = 'orbital';
  int _paletteIndex = 0;
  String _statusText = 'Idle';
  bool _reducedMotion = false;

  late B1CodesLoaderController _controller;

  final List<List<Color>> _palettes = [
    [const Color(0xFF4A90E2), const Color(0xFF50E3C2), const Color(0xFF9013FE)],
    [const Color(0xFFFF007F), const Color(0xFF00F0FF), const Color(0xFF7F00FF)],
    [const Color(0xFFFF3B30), const Color(0xFFFF9500), const Color(0xFFFFCC00)],
  ];

  @override
  void initState() {
    super.initState();
    _controller = B1CodesLoaderController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _handleResolve() {
    setState(() {
      _statusText = 'Resolving (Thermal Glow exit)...';
    });
    _controller.resolve();
  }

  void _handlePauseToggle() {
    setState(() {
      if (_controller.isPaused) {
        _controller.resume();
        _statusText = 'Resumed animation loop';
      } else {
        _controller.pause();
        _statusText = 'Paused animation loop';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final currentPalette = _palettes[_paletteIndex];

    return Scaffold(
      appBar: AppBar(
        title: const Text('b1codes_loaders Demo'),
        backgroundColor: const Color(0xFF161920),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32.0),
              decoration: BoxDecoration(
                color: const Color(0xFF161920),
                borderRadius: BorderRadius.circular(16.0),
                border: Border.all(color: const Color(0xFF2D3748)),
              ),
              child: Column(
                children: [
                  SizedBox(
                    height: 180,
                    width: 180,
                    child: Center(
                      child: _buildLoaderWidget(currentPalette),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Status: $_statusText',
                    style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 13),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ElevatedButton(
                        onPressed: _handleResolve,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.redAccent,
                        ),
                        child: const Text('resolve()'),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: _handlePauseToggle,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blueAccent,
                        ),
                        child: Text(_controller.isPaused ? 'resume()' : 'pause()'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20.0),
              decoration: BoxDecoration(
                color: const Color(0xFF161920),
                borderRadius: BorderRadius.circular(16.0),
                border: Border.all(color: const Color(0xFF2D3748)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Variant',
                    style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: ['orbital', 'nebula', 'cascade'].map((v) {
                      final isSelected = _selectedVariant == v;
                      return Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4.0),
                          child: ChoiceChip(
                            label: Text(v.toUpperCase()),
                            selected: isSelected,
                            onSelected: (selected) {
                              if (selected) {
                                setState(() {
                                  _selectedVariant = v;
                                  _controller.reset();
                                  _statusText = 'Switched to $v';
                                });
                              }
                            },
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Palette',
                    style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  ...List.generate(_palettes.length, (idx) {
                    final isSelected = _paletteIndex == idx;
                    return InkWell(
                      onTap: () => setState(() => _paletteIndex = idx),
                      child: Container(
                        padding: const EdgeInsets.all(12.0),
                        margin: const EdgeInsets.only(bottom: 8.0),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1F2937),
                          borderRadius: BorderRadius.circular(8.0),
                          border: isSelected
                              ? Border.all(color: const Color(0xFF3B82F6), width: 1.5)
                              : null,
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Palette ${idx + 1}', style: const TextStyle(fontSize: 13)),
                            Row(
                              children: _palettes[idx]
                                  .map((c) => Container(
                                        width: 12,
                                        height: 12,
                                        margin: const EdgeInsets.only(left: 4),
                                        decoration: BoxDecoration(
                                          color: c,
                                          shape: BoxShape.circle,
                                        ),
                                      ))
                                  .toList(),
                            )
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 12),
                  SwitchListTile(
                    title: const Text('Force Reduced Motion', style: TextStyle(fontSize: 13)),
                    subtitle: const Text('Render static dot grid'),
                    value: _reducedMotion,
                    onChanged: (val) => setState(() => _reducedMotion = val),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoaderWidget(List<Color> palette) {
    switch (_selectedVariant) {
      case 'nebula':
        return NebulaLoader(
          controller: _controller,
          palette: palette,
          size: const Size(180, 180),
          reducedMotion: _reducedMotion,
          onCycleComplete: () => setState(() => _statusText = 'Chromatic Pulse cycle complete'),
          onDismiss: () => setState(() => _statusText = 'Dismissed after resolution'),
        );
      case 'cascade':
        return CascadeLoader(
          controller: _controller,
          palette: palette,
          size: const Size(180, 180),
          reducedMotion: _reducedMotion,
          onCycleComplete: () => setState(() => _statusText = 'Chromatic Pulse cycle complete'),
          onDismiss: () => setState(() => _statusText = 'Dismissed after resolution'),
        );
      case 'orbital':
      default:
        return OrbitalLoader(
          controller: _controller,
          palette: palette,
          size: const Size(180, 180),
          reducedMotion: _reducedMotion,
          onCycleComplete: () => setState(() => _statusText = 'Chromatic Pulse cycle complete'),
          onDismiss: () => setState(() => _statusText = 'Dismissed after resolution'),
        );
    }
  }
}

/**
 * @file packages/react-native/example/App.tsx
 * @description Example app demonstrating @b1codes/loaders-react-native components.
 */

import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  OrbitalLoader,
  NebulaLoader,
  CascadeLoader,
  LoaderRef,
} from '@b1codes/loaders-react-native';

const PALETTES = [
  { name: 'LLC Tech Luxury', colors: ['#4A90E2', '#50E3C2', '#9013FE'] },
  { name: 'Cyberpunk Neon', colors: ['#FF007F', '#00F0FF', '#7F00FF'] },
  { name: 'Solar Thermal', colors: ['#FF3B30', '#FF9500', '#FFCC00'] },
];

export default function App() {
  const [variant, setVariant] = useState<'orbital' | 'nebula' | 'cascade'>('orbital');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [statusText, setStatusText] = useState('Idle');
  const [reducedMotion, setReducedMotion] = useState(false);

  const loaderRef = useRef<LoaderRef | null>(null);
  const currentPalette = PALETTES[paletteIndex].colors;

  const handleResolve = () => {
    setStatusText('Resolving (Thermal Glow exit)...');
    loaderRef.current?.resolve();
  };

  const handlePause = () => {
    if (loaderRef.current?.isPaused()) {
      loaderRef.current?.resume();
      setStatusText('Resumed animation loop');
    } else {
      loaderRef.current?.pause();
      setStatusText('Paused animation loop');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>@b1codes/loaders-react-native</Text>
        <Text style={styles.headerSubtitle}>React Native Particle Loaders (Skia)</Text>

        <View style={styles.previewCard}>
          {variant === 'orbital' && (
            <OrbitalLoader
              ref={loaderRef}
              palette={currentPalette}
              size={180}
              reducedMotion={reducedMotion}
              onCycleComplete={() => setStatusText('Chromatic Pulse cycle complete')}
              onDismiss={() => setStatusText('Dismissed after resolution')}
            />
          )}
          {variant === 'nebula' && (
            <NebulaLoader
              ref={loaderRef}
              palette={currentPalette}
              size={180}
              reducedMotion={reducedMotion}
              onCycleComplete={() => setStatusText('Chromatic Pulse cycle complete')}
              onDismiss={() => setStatusText('Dismissed after resolution')}
            />
          )}
          {variant === 'cascade' && (
            <CascadeLoader
              ref={loaderRef}
              palette={currentPalette}
              size={180}
              reducedMotion={reducedMotion}
              onCycleComplete={() => setStatusText('Chromatic Pulse cycle complete')}
              onDismiss={() => setStatusText('Dismissed after resolution')}
            />
          )}

          <Text style={styles.statusLabel}>
            Status: <Text style={styles.statusValue}>{statusText}</Text>
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.actionButton, styles.resolveButton]} onPress={handleResolve}>
              <Text style={styles.buttonText}>resolve()</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.pauseButton]} onPress={handlePause}>
              <Text style={styles.buttonText}>pause / resume</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controlCard}>
          <Text style={styles.sectionTitle}>Variant</Text>
          <View style={styles.buttonRow}>
            {(['orbital', 'nebula', 'cascade'] as const).map((v) => (
              <TouchableOpacity
                key={v}
                style={[
                  styles.tabButton,
                  variant === v && styles.tabButtonActive,
                ]}
                onPress={() => setVariant(v)}
              >
                <Text style={styles.tabButtonText}>{v.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Palette</Text>
          {PALETTES.map((p, idx) => (
            <TouchableOpacity
              key={p.name}
              style={[
                styles.paletteRow,
                paletteIndex === idx && styles.paletteRowActive,
              ]}
              onPress={() => setPaletteIndex(idx)}
            >
              <Text style={styles.paletteName}>{p.name}</Text>
              <View style={styles.dotsRow}>
                {p.colors.map((c) => (
                  <View key={c} style={[styles.colorDot, { backgroundColor: c }]} />
                ))}
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setReducedMotion(!reducedMotion)}
          >
            <Text style={styles.toggleText}>
              Reduced Motion: {reducedMotion ? 'ON (Static Grid)' : 'OFF (Animated)'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F12',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  previewCard: {
    width: '100%',
    backgroundColor: '#161920',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  statusLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 16,
  },
  statusValue: {
    color: '#60A5FA',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  resolveButton: {
    backgroundColor: '#EF4444',
  },
  pauseButton: {
    backgroundColor: '#3B82F6',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  controlCard: {
    width: '100%',
    backgroundColor: '#161920',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  sectionTitle: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#3B82F6',
  },
  tabButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    marginBottom: 8,
  },
  paletteRowActive: {
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  paletteName: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  toggleRow: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleText: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '600',
  },
});

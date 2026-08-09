/**
 * @file scripts/verify-constants.js
 * @description Canonical Constants CI Verification Script.
 * Ensures Dart (Flutter) and Swift (SwiftUI) constant files match the canonical
 * JS/TS physical constants in packages/core/src/constants.ts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const jsPath = path.join(rootDir, 'packages/core/src/constants.ts');
const dartPath = path.join(rootDir, 'packages/flutter/lib/src/core/constants.dart');
const swiftDir = path.join(rootDir, 'packages/swift/Sources/B1CodesLoaders/Core');

function verifyFileExists(filePath, name) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: ${name} file not found at ${filePath}`);
    process.exit(1);
  }
}

verifyFileExists(jsPath, 'JS/TS Constants');
verifyFileExists(dartPath, 'Dart Constants');
verifyFileExists(swiftDir, 'Swift Core Directory');

const jsContent = fs.readFileSync(jsPath, 'utf8');
const dartContent = fs.readFileSync(dartPath, 'utf8');

// Concatenate all Swift core files for verification
const swiftFiles = fs.readdirSync(swiftDir).filter((f) => f.endsWith('.swift'));
const swiftContent = swiftFiles
  .map((f) => fs.readFileSync(path.join(swiftDir, f), 'utf8'))
  .join('\n');

const requiredChecks = [
  { name: 'Chromatic Pulse Duration (3200ms)', value: '3200' },
  { name: 'Drag Resistance (0.15)', value: '0.15' },
  { name: 'Spring Stiffness (180)', value: '180' },
  { name: 'Spring Damping (12)', value: '12' },
  { name: 'Thermal Glow Excitation (50ms)', value: '50' },
  { name: 'Thermal Glow Dissipation (300ms)', value: '300' },
  { name: 'Thermal Glow Total Duration (350ms)', value: '350' },
  { name: 'Cubic Bezier Point x1 (0.45)', value: '0.45' },
  { name: 'Cubic Bezier Point x2 (0.55)', value: '0.55' },
  { name: 'Dust Mass (0.5)', value: '0.5' },
  { name: 'Motes Mass (1.0)', value: '1.0' },
  { name: 'Cores Mass (2.5)', value: '2.5' },
  { name: 'Background Blur (4.0)', value: '4.0' },
  { name: 'Midground Blur (1.0)', value: '1.0' },
];

let hasError = false;

console.log('🔍 Auditing Physical Constants across platforms (JS, Dart, Swift)...');

for (const check of requiredChecks) {
  const inJS = jsContent.includes(check.value);
  const inDart = dartContent.includes(check.value);
  const inSwift = swiftContent.includes(check.value);

  if (!inJS || !inDart || !inSwift) {
    console.error(`❌ Constant mismatch for "${check.name}" (value: ${check.value})`);
    console.error(`   JS: ${inJS ? '✅' : '❌'}, Dart: ${inDart ? '✅' : '❌'}, Swift: ${inSwift ? '✅' : '❌'}`);
    hasError = true;
  } else {
    console.log(`  ✓ ${check.name} matched across JS, Dart, Swift`);
  }
}

if (hasError) {
  console.error('\n❌ Canonical constants verification failed! Drift detected.');
  process.exit(1);
} else {
  console.log('\n✅ All canonical physics constants match perfectly across JS, Dart, and Swift!');
}

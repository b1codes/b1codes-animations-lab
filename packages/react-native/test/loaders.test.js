import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';

import {
  OrbitalLoader,
  NebulaLoader,
  CascadeLoader,
  NeuralLoader,
  GlobeLoader,
} from '../dist/index.js';

describe('@b1codes/loaders-react-native Component Suite', () => {
  it('exports OrbitalLoader, NebulaLoader, CascadeLoader, NeuralLoader, and GlobeLoader components', () => {
    assert.equal(typeof OrbitalLoader, 'object'); // React.memo forwardRef object
    assert.equal(typeof NebulaLoader, 'object');
    assert.equal(typeof CascadeLoader, 'object');
    assert.equal(typeof NeuralLoader, 'object');
    assert.equal(typeof GlobeLoader, 'object');
  });

  it('verifies OrbitalLoader component displayName and type structure', () => {
    assert.equal(OrbitalLoader.displayName, 'OrbitalLoader');
  });

  it('verifies NebulaLoader component displayName and type structure', () => {
    assert.equal(NebulaLoader.displayName, 'NebulaLoader');
  });

  it('verifies CascadeLoader component displayName and type structure', () => {
    assert.equal(CascadeLoader.displayName, 'CascadeLoader');
  });

  it('verifies NeuralLoader component displayName and type structure', () => {
    assert.equal(NeuralLoader.displayName, 'NeuralLoader');
  });

  it('verifies GlobeLoader component displayName and type structure', () => {
    assert.equal(GlobeLoader.displayName, 'GlobeLoader');
  });

  it('validates loader prop interfaces and accessibilityLabel prop', () => {
    const palette = ['#4A90E2', '#50E3C2', '#9013FE'];

    const orbitalElem = React.createElement(OrbitalLoader, {
      palette,
      size: 64,
      speed: 1.5,
      intensity: 0.8,
      accessibilityLabel: 'Custom RN Loading Indicator',
    });

    assert.equal(orbitalElem.props.palette, palette);
    assert.equal(orbitalElem.props.size, 64);
    assert.equal(orbitalElem.props.speed, 1.5);
    assert.equal(orbitalElem.props.accessibilityLabel, 'Custom RN Loading Indicator');
  });

  it('validates size prop with LoaderSize object format ({ width, height })', () => {
    const palette = ['#FF007F', '#00F0FF'];

    const cascadeElem = React.createElement(CascadeLoader, {
      palette,
      size: { width: 180, height: 180 },
      gravity: 1.1,
      wind: 0.9,
    });

    assert.deepEqual(cascadeElem.props.size, { width: 180, height: 180 });
    assert.equal(cascadeElem.props.gravity, 1.1);
    assert.equal(cascadeElem.props.wind, 0.9);
  });

  it('validates reduced motion prop pass-through', () => {
    const nebulaElem = React.createElement(NebulaLoader, {
      palette: ['#10B981', '#06B6D4'],
      reducedMotion: true,
    });

    assert.equal(nebulaElem.props.reducedMotion, true);
  });
});

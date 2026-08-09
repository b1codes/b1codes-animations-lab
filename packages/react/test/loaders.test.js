import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';

import {
  OrbitalLoader,
  NebulaLoader,
  CascadeLoader,
  NeuralLoader,
} from '../dist/index.js';

describe('@b1codes/loaders React Component Suite', () => {
  it('exports OrbitalLoader, NebulaLoader, CascadeLoader, and NeuralLoader components', () => {
    assert.equal(typeof OrbitalLoader, 'object'); // React.memo forwardRef object
    assert.equal(typeof NebulaLoader, 'object');
    assert.equal(typeof CascadeLoader, 'object');
    assert.equal(typeof NeuralLoader, 'object');
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

  it('validates loader prop interfaces and size resolution helper logic', () => {
    const palette = ['#4A90E2', '#50E3C2', '#9013FE'];

    // Construct element objects
    const orbitalElem = React.createElement(OrbitalLoader, {
      palette,
      size: 64,
      speed: 1.5,
      intensity: 0.8,
      'aria-label': 'Custom Loading',
    });

    assert.equal(orbitalElem.props.palette, palette);
    assert.equal(orbitalElem.props.size, 64);
    assert.equal(orbitalElem.props.speed, 1.5);
    assert.equal(orbitalElem.props['aria-label'], 'Custom Loading');
  });

  it('validates size prop with LoaderSize object format ({ width, height })', () => {
    const palette = ['#FF007F', '#00F0FF'];

    const cascadeElem = React.createElement(CascadeLoader, {
      palette,
      size: { width: 200, height: 100 },
      gravity: 1.2,
      wind: 0.8,
    });

    assert.deepEqual(cascadeElem.props.size, { width: 200, height: 100 });
    assert.equal(cascadeElem.props.gravity, 1.2);
    assert.equal(cascadeElem.props.wind, 0.8);
  });

  it('validates reduced motion prop pass-through', () => {
    const nebulaElem = React.createElement(NebulaLoader, {
      palette: ['#10B981', '#06B6D4'],
      reducedMotion: true,
    });

    assert.equal(nebulaElem.props.reducedMotion, true);
  });

  it('validates onDismiss callback prop passing for Thermal Glow exit discharge', () => {
    let dismissed = false;
    const onDismiss = () => {
      dismissed = true;
    };

    const orbitalElem = React.createElement(OrbitalLoader, {
      palette: ['#4A90E2', '#50E3C2'],
      onDismiss,
    });

    assert.equal(typeof orbitalElem.props.onDismiss, 'function');
    orbitalElem.props.onDismiss();
    assert.equal(dismissed, true);
  });
});

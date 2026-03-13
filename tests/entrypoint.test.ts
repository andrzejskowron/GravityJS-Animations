import { describe, it, expect } from 'vitest';
import GravityJS, { initComponents, initGravity, GravityEngine } from 'gravityjs';

/**
 * Entry-point level tests that exercise the built package exports.
 *
 * These run against the compiled dist files (via the vitest alias for `gravityjs`)
 * to catch packaging/exports regressions before publishing.
 */

describe('gravityjs package entrypoint', () => {
  it('exposes expected named and default exports (ESM)', () => {
    expect(typeof initComponents).toBe('function');
    expect(typeof initGravity).toBe('function');
    expect(typeof GravityEngine).toBe('function');

    expect(GravityJS).toBeDefined();
    expect(GravityJS.initComponents).toBe(initComponents);
    expect(GravityJS.initGravity).toBe(initGravity);
    expect(GravityJS.GravityEngine).toBe(GravityEngine);
  });

  it('has a consistent CommonJS export shape', () => {
    const cjs = require('../dist/gravityjs.cjs');

    expect(cjs).toBeDefined();
    expect(typeof cjs.initComponents).toBe('function');
    expect(typeof cjs.initGravity).toBe('function');
    expect(typeof cjs.GravityEngine).toBe('function');

    expect(cjs.default).toBeDefined();
    expect(cjs.default.initComponents).toBe(cjs.initComponents);
    expect(cjs.default.initGravity).toBe(cjs.initGravity);
    expect(cjs.default.GravityEngine).toBe(cjs.GravityEngine);
  });
});

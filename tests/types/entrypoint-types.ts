import GravityJS, { initComponents, initGravity, GravityEngine } from 'gravityjs';

// Basic usage-style type checks for the built package entrypoint.

const teardown: () => void = initComponents();

const engine: GravityEngine = initGravity();
engine.start();

// Default export should expose the same API as named exports.
GravityJS.initComponents();
const engine2 = GravityJS.initGravity();
engine2.start();


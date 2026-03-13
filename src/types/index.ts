/**
 * GravityJS – Shared type definitions for the component system.
 */

/** CSS-animatable properties the PhysicsService can drive. */
export type AnimatableProperty =
  | 'scale'
  | 'scaleX'
  | 'scaleY'
  | 'translateX'
  | 'translateY'
  | 'rotate'
  | 'shadow'
  | 'maxHeight'
  | 'width'
  | 'opacity'
  | 'blur'
  | 'borderRadius';

/**
 * Material behaviour hint – maps to pre-tuned spring multipliers and
 * squash-and-stretch intensity, applied on top of bounce/friction/elasticity.
 *
 * - `rigid`  – very stiff, well-damped, no deformation (glass, hard plastic)
 * - `metal`  – heavy, slight overshoot, barely any squash
 * - `rubber` – balanced bounce with visible squash-and-stretch
 * - `jelly`  – soft, underdamped, maximum squash-and-stretch deformation
 */
export type MaterialHint = 'rigid' | 'metal' | 'rubber' | 'jelly';

/** User-facing physics knobs exposed via data-gravity-* attributes. */
export interface ComponentPhysicsConfig {
  bounce: number;
  friction: number;
  elasticity: number;
  /** Simulated mass – heavier objects accelerate more slowly (default: 1). */
  mass?: number;
  /** Material hint; modulates spring constants and squash-and-stretch. */
  material?: MaterialHint;
}

/** Internal spring constants derived from ComponentPhysicsConfig. */
export interface SpringConfig {
  stiffness: number;
  damping: number;
}

/**
 * Per-element transform state, kept in a WeakMap so that multiple
 * concurrent animations (e.g. scale + translateX) compose correctly
 * instead of overwriting each other.
 */
export interface TransformState {
  scale?: number;
  /** Set by squash-and-stretch (material hint) or explicit scaleX animation. */
  scaleX?: number;
  /** Set by squash-and-stretch (material hint) or explicit scaleY animation. */
  scaleY?: number;
  translateX?: number;
  translateY?: number;
  rotate?: number;
}

/** Internal state for one animating scalar value on one element. */
export interface AnimatorState {
  current: number;
  velocity: number;
  target: number;
  stiffness: number;
  damping: number;
  /** Effective mass used in F = −k·x − b·v → a = F/mass (default: 1). */
  mass: number;
  /**
   * Squash-and-stretch intensity derived from the `material` hint.
   * Only active when `property === 'scale'`. 0 = disabled.
   */
  squashFactor: number;
  isRunning: boolean;
  animationId: number | null;
  lastTime: number;
  element: HTMLElement;
  property: AnimatableProperty;
}

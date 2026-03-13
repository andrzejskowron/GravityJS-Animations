import type { MaterialHint } from '../types';

/**
 * Spring-physics multipliers applied by PhysicsService on top of the
 * user-supplied bounce / friction / elasticity values.
 *
 * All fields are unitless multipliers (×) unless noted otherwise.
 */
export interface SpringMaterialConfig {
  /** Multiplier on the bounce-derived base stiffness. */
  stiffnessMul: number;
  /** Multiplier on the friction/elasticity-derived base damping. */
  dampingMul: number;
  /**
   * Squash-and-stretch intensity.
   * 0 = none (rigid / metal), 0.24 = maximum deformation (jelly).
   *
   * Math:  s = clamp(velocity × squashFactor × 0.05, ±0.35)
   *        scaleX = val × (1 − s),  scaleY = val × (1 + s)
   */
  squashFactor: number;
  /** Multiplier on the element's simulated mass. */
  massMul: number;
}

/**
 * Newtonian-body parameters used by GravityEngine / PhysicsBody.
 * Apply these when constructing an engine body to match the chosen material.
 */
export interface BodyMaterialConfig {
  /** Relative simulated mass (default engine baseline: 1). */
  mass: number;
  /**
   * Coefficient of restitution — how much kinetic energy is retained on
   * ground / boundary impact.  0 = dead stop, 1 = perfect bounce.
   */
  elasticity: number;
  /**
   * Ground-contact friction (0 = frictionless, 1 = instant stop).
   */
  friction: number;
  /**
   * Air-resistance coefficient applied each physics tick.
   * Higher values slow the body faster through the air.
   */
  airDrag: number;
}

/**
 * Effective elastic-plate properties used by contour deformation.
 *
 * Values are expressed in SI units and fed into plate-bending equations,
 * while being tuned for UI-scale geometry so the resulting deformation stays
 * visible and stable on screen.
 */
export interface PlateMaterialConfig {
  /** Effective Young's modulus E in pascals. */
  youngModulus: number;
  /** Poisson ratio ν. */
  poissonRatio: number;
  /** Plate thickness h in metres. */
  thickness: number;
  /** Material density ρ in kg/m³. */
  density: number;
  /** Metres represented by one CSS pixel for the plate solver. */
  metersPerPixel: number;
}

/**
 * Complete physics profile for a single material type.
 *
 * `spring` drives UI component animations (PhysicsService).
 * `body`   drives falling / bouncing DOM elements (GravityEngine).
 */
export interface MaterialConfig {
  spring: SpringMaterialConfig;
  body: BodyMaterialConfig;
  plate: PlateMaterialConfig;
}

/**
 * Pre-tuned physics profiles for the four built-in GravityJS materials.
 *
 * These are the canonical values used internally by the engine.
 * You can read, spread, or override them in your own code:
 *
 * @example
 * // ESM / bundler
 * import { materialPresets } from 'gravityjs';
 * const body = engine.addBody({ element: el, ...materialPresets.rubber.body });
 *
 * @example
 * // UMD / plain HTML
 * const preset = GravityJS.materialPresets.jelly;
 * const body = engine.addBody({ element: el, ...preset.body });
 *
 * @example
 * // Use material hint on a component element
 * el.setAttribute('data-gravity-material', 'metal');
 */
export const materialPresets: Record<MaterialHint, MaterialConfig> = {
  /**
   * Rigid — glass, hard plastic.
   * Very stiff spring, well-damped, no squash-and-stretch, heavy feel.
   */
  rigid: {
    spring: { stiffnessMul: 1.6,  dampingMul: 1.5,  squashFactor: 0.00, massMul: 1.3  },
    body:   { mass: 2.5,           elasticity: 0.08, friction: 0.70,     airDrag: 0.008 },
    plate:  { youngModulus: 2.6e8, poissonRatio: 0.24, thickness: 0.0024, density: 1250, metersPerPixel: 0.0009 },
  },

  /**
   * Metal — steel, iron.
   * Heavy, slight overshoot, minimal squash, slow to start and stop.
   */
  metal: {
    spring: { stiffnessMul: 1.4,  dampingMul: 1.2,  squashFactor: 0.04, massMul: 1.5  },
    body:   { mass: 3.5,           elasticity: 0.25, friction: 0.55,     airDrag: 0.006 },
    plate:  { youngModulus: 4.8e8, poissonRatio: 0.29, thickness: 0.0022, density: 7800, metersPerPixel: 0.0009 },
  },

  /**
   * Rubber — bouncy ball, eraser.
   * Balanced bounce with visible squash-and-stretch, light mass.
   */
  rubber: {
    spring: { stiffnessMul: 1.0,  dampingMul: 0.85, squashFactor: 0.14, massMul: 0.9  },
    body:   { mass: 0.8,           elasticity: 0.82, friction: 0.35,     airDrag: 0.018 },
    plate:  { youngModulus: 8.5e6, poissonRatio: 0.49, thickness: 0.0034, density: 1120, metersPerPixel: 0.0009 },
  },

  /**
   * Jelly — gelatin, slime.
   * Soft, underdamped spring, maximum squash-and-stretch deformation, light.
   */
  jelly: {
    spring: { stiffnessMul: 0.65, dampingMul: 0.45, squashFactor: 0.24, massMul: 0.55 },
    body:   { mass: 0.45,          elasticity: 0.55, friction: 0.48,     airDrag: 0.025 },
    plate:  { youngModulus: 1.2e6, poissonRatio: 0.49, thickness: 0.0048, density: 1030, metersPerPixel: 0.0009 },
  },
};

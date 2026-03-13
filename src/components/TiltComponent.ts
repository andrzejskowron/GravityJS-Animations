import { BaseComponent } from './BaseComponent';
import { PhysicsService } from '../core/PhysicsService';
import type { ComponentPhysicsConfig } from '../types';

const DEFAULTS: ComponentPhysicsConfig & { tiltAngle: number; liftPx: number } = {
  tiltAngle: 8,
  liftPx: 6,
  bounce: 0.5,
  friction: 0.25,
  elasticity: 0.65,
};

/**
 * TiltComponent – Physics-driven hover-tilt + lift effect for any element.
 *
 * Activate with:  `data-gravity-tilt`
 *
 * Optional per-element overrides (data attributes):
 *   data-gravity-tilt-angle  – rotation angle in degrees on hover  (default: 8)
 *   data-gravity-lift        – vertical lift distance in px         (default: 6)
 *   data-gravity-bounce      – spring bounce                        (default: 0.5)
 *   data-gravity-friction    – spring friction                      (default: 0.25)
 *   data-gravity-elasticity  – spring elasticity                    (default: 0.65)
 *   data-gravity-material    – material hint (rigid|metal|rubber|jelly)
 *   data-gravity-mass        – simulated mass                       (default: 1)
 *
 * Works on: <div>, <button>, <a>, <img>, or any block element.
 * Tip: combine with `data-gravity-motion-blur` for motion-blur feedback.
 */
export class TiltComponent extends BaseComponent {
  static readonly selector = '[data-gravity-tilt]';

  constructor(element: HTMLElement, physics?: PhysicsService) {
    super(element, physics);
  }

  attach(): void {
    this.on(this.element, 'mouseenter', () => {
      const cfg       = this.physicsConfig(DEFAULTS);
      const tiltAngle = this.numAttr('tilt-angle', DEFAULTS.tiltAngle);
      const liftPx    = this.numAttr('lift',        DEFAULTS.liftPx);
      this.physics.animate(this.element, 'rotate',     tiltAngle, cfg);
      this.physics.animate(this.element, 'translateY', -liftPx,   cfg);
    });

    this.on(this.element, 'mouseleave', () => {
      const cfg = this.physicsConfig(DEFAULTS);
      this.physics.animate(this.element, 'rotate',     0, cfg);
      this.physics.animate(this.element, 'translateY', 0, cfg);
    });

    // Press down slightly on mousedown, spring back on mouseup
    this.on(this.element, 'mousedown', () => {
      const cfg    = this.physicsConfig(DEFAULTS);
      const liftPx = this.numAttr('lift', DEFAULTS.liftPx);
      this.physics.animate(this.element, 'translateY', liftPx * 0.4, cfg);
    });

    this.on(this.element, 'mouseup', () => {
      const cfg    = this.physicsConfig(DEFAULTS);
      const liftPx = this.numAttr('lift', DEFAULTS.liftPx);
      this.physics.animate(this.element, 'translateY', -liftPx, cfg);
    });
  }
}


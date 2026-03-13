import { BaseComponent } from './BaseComponent';
import { PhysicsService } from '../core/PhysicsService';
import type { ComponentPhysicsConfig } from '../types';

const DEFAULTS: ComponentPhysicsConfig & { scale: number } = {
  scale: 1.05,
  bounce: 0.6,
  friction: 0.3,
  elasticity: 0.6,
};

/**
 * NavigationComponent – Physics hover feedback for navigation links.
 *
 * Activate with:  `data-gravity-navigation` on nav link elements (<a> tags within .nav).
 *
 * Optional per-element overrides (data attributes):
 *   data-gravity-scale       – hover scale target  (default: 1.05)
 *   data-gravity-bounce      – spring bounce       (default: 0.6)
 *   data-gravity-friction    – spring friction     (default: 0.3)
 *   data-gravity-elasticity  – spring elasticity   (default: 0.6)
 *
 * Works on: <a>, or any nav element – framework-agnostic.
 */
export class NavigationComponent extends BaseComponent {
  static readonly selector = '[data-gravity-navigation]';

  constructor(element: HTMLElement, physics?: PhysicsService) {
    super(element, physics);
  }

  attach(): void {
    this.on(this.element, 'mouseenter', () => {
      const cfg   = this.physicsConfig(DEFAULTS);
      const scale = this.numAttr('scale', DEFAULTS.scale);

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', -2, cfg),
        );
      } else {
        // No text to animate – apply scale directly to the element
        this.physics.animate(this.element, 'scale', scale, cfg);
      }
    });

    this.on(this.element, 'mouseleave', () => {
      const cfg = this.physicsConfig(DEFAULTS);

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', 0, cfg),
        );
      } else {
        // No text to animate – return element to rest
        this.physics.animate(this.element, 'scale', 1, cfg);
      }
    });

    this.on(this.element, 'mousedown', () => {
      const cfg = this.physicsConfig(DEFAULTS);

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', 2, cfg),
        );
      } else {
        this.physics.animate(this.element, 'scale', 0.96, cfg);
      }
    });

    this.on(this.element, 'mouseup', () => {
      const cfg   = this.physicsConfig(DEFAULTS);
      const scale = this.numAttr('scale', DEFAULTS.scale);

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', -2, cfg),
        );
      } else {
        this.physics.animate(this.element, 'scale', scale, cfg);
      }
    });

    // Touch support for nav links
    this.on(this.element, 'touchstart', (e) => {
      e.preventDefault();
      const cfg = this.physicsConfig(DEFAULTS);

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', 2, cfg),
        );
      } else {
        this.physics.animate(this.element, 'scale', 0.96, cfg);
      }
    });

    this.on(this.element, 'touchend', () => {
      const cfg   = this.physicsConfig(DEFAULTS);
      const scale = this.numAttr('scale', DEFAULTS.scale);

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', -2, cfg),
        );
      } else {
        this.physics.animate(this.element, 'scale', scale, cfg);
      }
    });

    this.startTextCounterScale();
  }
}
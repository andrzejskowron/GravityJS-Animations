import { BaseComponent } from './BaseComponent';
import { PhysicsService } from '../core/PhysicsService';
import type { ComponentPhysicsConfig } from '../types';

const DEFAULTS: ComponentPhysicsConfig & { scale: number } = {
  scale: 1.08,
  bounce: 0.6,
  friction: 0.3,
  elasticity: 0.6,
};

/**
 * ButtonComponent – Physics hover & press feedback for any clickable element.
 *
 * Activate with:  `data-gravity-button`
 *
 * Optional per-element overrides (data attributes):
 *   data-gravity-scale                  – hover scale target  (default: 1.08)
 *   data-gravity-bounce                 – spring bounce       (default: 0.6)
 *   data-gravity-friction               – spring friction     (default: 0.3)
 *   data-gravity-elasticity             – spring elasticity   (default: 0.6)
 *
 * Material deformation (opt-in via `data-gravity-deformation`):
 *   data-gravity-deformation            – enable position-aware deformation
 *   data-gravity-deformation-strength   – intensity multiplier (default: 1.0)
 *   data-gravity-deformation-depth      – base scale reduction (default: 0.06)
 *
 *   When deformation is active the press animation varies by where the element
 *   is clicked: centre → uniform compression, edge → directional compression,
 *   corner → diagonal deformation and translation toward the pressed corner.
 *   In this mode ALL scale operations (hover + press) use per-axis scaleX/scaleY
 *   to avoid TransformState conflicts with the uniform `scale` property.
 *
 * Works on: <button>, <a>, <div>, or any element – framework-agnostic.
 */
export class ButtonComponent extends BaseComponent {
  static readonly selector = '[data-gravity-button]';

  constructor(element: HTMLElement, physics?: PhysicsService) {
    super(element, physics);
  }

  attach(): void {
    this.on(this.element, 'mouseenter', (e) => {
      const cfg   = this.physicsConfig(DEFAULTS);
      const scale = this.numAttr('scale', DEFAULTS.scale);

      if (this.shouldDeform()) {
        if (this.isHoverDeformationTrigger()) {
          const me = e as MouseEvent;
          this.applyDeformation(me.clientX, me.clientY, cfg);
        } else {
          // Deformation mode: use per-axis scale to avoid TransformState conflicts.
          this.physics.animate(this.element, 'scaleX', scale, cfg);
          this.physics.animate(this.element, 'scaleY', scale, cfg);
        }
      } else {
        this.physics.animate(this.element, 'scale', scale, cfg);
      }

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', -2, cfg),
        );
      }
    });

    this.on(this.element, 'mousemove', (e) => {
      if (!this.isHoverDeformationTrigger()) return;
      const cfg = this.physicsConfig(DEFAULTS);
      const me = e as MouseEvent;
      this.applyDeformation(me.clientX, me.clientY, cfg);
    });

    this.on(this.element, 'mouseleave', () => {
      const cfg = this.physicsConfig(DEFAULTS);

      if (this.shouldDeform()) {
        this.resetDeformation(cfg, 1);
      } else {
        this.physics.animate(this.element, 'scale', 1, cfg);
      }

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', 0, cfg),
        );
      }
    });

    this.on(this.element, 'mousedown', (e) => {
      const cfg = this.physicsConfig(DEFAULTS);

      if (this.shouldDeform()) {
        if (!this.isHoverDeformationTrigger()) {
          const me = e as MouseEvent;
          this.applyDeformation(me.clientX, me.clientY, cfg);
        }
      } else {
        this.physics.animate(this.element, 'scale', 0.94, cfg);
      }

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', 2, cfg),
        );
      }
    });

    this.on(this.element, 'mouseup', () => {
      const cfg   = this.physicsConfig(DEFAULTS);
      const scale = this.numAttr('scale', DEFAULTS.scale);

      if (this.shouldDeform()) {
        if (!this.isHoverDeformationTrigger()) {
          // Return to hover scale — cursor is still over the element.
          this.resetDeformation(cfg, scale);
        }
      } else {
        this.physics.animate(this.element, 'scale', scale, cfg);
      }

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', -2, cfg),
        );
      }
    });

    // Touch support
    this.on(this.element, 'touchstart', (e) => {
      const cfg = this.physicsConfig(DEFAULTS);

      if (this.shouldDeform()) {
        const te    = e as TouchEvent;
        const touch = te.touches[0];
        if (touch) {
          this.applyDeformation(touch.clientX, touch.clientY, cfg);
        }
      } else {
        this.physics.animate(this.element, 'scale', 0.94, cfg);
      }

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', 2, cfg),
        );
      }
    });

    this.on(this.element, 'touchend', () => {
      const cfg = this.physicsConfig(DEFAULTS);

      if (this.shouldDeform()) {
        // No hover state on touch devices — return to rest (scale 1).
        this.resetDeformation(cfg, 1);
      } else {
        this.physics.animate(this.element, 'scale', 1, cfg);
      }

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', 0, cfg),
        );
      }
    });

    this.startTextCounterScale();
  }
}
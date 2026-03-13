import { BaseComponent } from './BaseComponent';
import { PhysicsService } from '../core/PhysicsService';
import type { ComponentPhysicsConfig } from '../types';

const DEFAULTS: ComponentPhysicsConfig & { scale: number; shadow: number } = {
  scale: 1.04,
  shadow: 20,
  bounce: 0.4,
  friction: 0.4,
  elasticity: 0.5,
};

/**
 * CardComponent – Physics hover lift animation (scale + drop-shadow).
 *
 * Activate with:  `data-gravity-card`
 *
 * Optional per-element overrides (data attributes):
 *   data-gravity-scale                  – hover scale target        (default: 1.04)
 *   data-gravity-shadow                 – hover shadow spread in px (default: 20)
 *   data-gravity-bounce                 – spring bounce             (default: 0.4)
 *   data-gravity-friction               – spring friction           (default: 0.4)
 *   data-gravity-elasticity             – spring elasticity         (default: 0.5)
 *
 * Material deformation (opt-in via `data-gravity-deformation`):
 *   data-gravity-deformation            – enable position-aware press deformation
 *   data-gravity-deformation-strength   – intensity multiplier (default: 1.0)
 *   data-gravity-deformation-depth      – base scale reduction (default: 0.06)
 *
 * The element should have `will-change: transform, box-shadow` set in CSS
 * for optimal GPU compositing.
 */
export class CardComponent extends BaseComponent {
  static readonly selector = '[data-gravity-card]';

  constructor(element: HTMLElement, physics?: PhysicsService) {
    super(element, physics);
  }

  attach(): void {
    this.on(this.element, 'mouseenter', (e) => {
      const cfg    = this.physicsConfig(DEFAULTS);
      const scale  = this.numAttr('scale',  DEFAULTS.scale);
      const shadow = this.numAttr('shadow', DEFAULTS.shadow);

      if (this.shouldDeform()) {
        if (this.isHoverDeformationTrigger()) {
          const me = e as MouseEvent;
          this.applyDeformation(me.clientX, me.clientY, cfg);
        } else {
          // Deformation mode: use per-axis scale so that per-axis deformation
          // on press does not conflict with the uniform scale property.
          this.physics.animate(this.element, 'scaleX', scale, cfg);
          this.physics.animate(this.element, 'scaleY', scale, cfg);
        }
      } else {
        this.physics.animate(this.element, 'scale', scale, cfg);
      }
      this.physics.animate(this.element, 'shadow', shadow, cfg);
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
      this.physics.animate(this.element, 'shadow', 0, cfg);
    });

    this.on(this.element, 'mousedown', (e) => {
      if (!this.shouldDeform() || this.isHoverDeformationTrigger()) return;
      const cfg = this.physicsConfig(DEFAULTS);
      const me  = e as MouseEvent;
      this.applyDeformation(me.clientX, me.clientY, cfg);
    });

    this.on(this.element, 'mouseup', () => {
      if (!this.shouldDeform() || this.isHoverDeformationTrigger()) return;
      const cfg   = this.physicsConfig(DEFAULTS);
      const scale = this.numAttr('scale', DEFAULTS.scale);
      // Return to hover scale — cursor is still over the card.
      this.resetDeformation(cfg, scale);
    });

    // Touch support for deformation.
    this.on(this.element, 'touchstart', (e) => {
      if (!this.shouldDeform()) return;
      const cfg   = this.physicsConfig(DEFAULTS);
      const te    = e as TouchEvent;
      const touch = te.touches[0];
      if (touch) this.applyDeformation(touch.clientX, touch.clientY, cfg);
    });

    this.on(this.element, 'touchend', () => {
      if (!this.shouldDeform()) return;
      const cfg = this.physicsConfig(DEFAULTS);
      this.resetDeformation(cfg, 1);
    });
  }
}
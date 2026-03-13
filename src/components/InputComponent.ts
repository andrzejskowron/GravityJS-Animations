import { BaseComponent } from './BaseComponent';
import { PhysicsService } from '../core/PhysicsService';
import type { ComponentPhysicsConfig } from '../types';

const DEFAULTS: ComponentPhysicsConfig & { scale: number } = {
  scale: 1.02,
  bounce: 0.3,
  friction: 0.5,
  elasticity: 0.4,
};

/**
 * InputComponent – Subtle physics focus/blur feedback for form inputs.
 *
 * Activate with:  `data-gravity-input`
 *
 * Optional per-element overrides (data attributes):
 *   data-gravity-scale                  – focus scale target          (default: 1.02)
 *   data-gravity-bounce                 – spring bounce               (default: 0.3)
 *   data-gravity-friction               – spring friction             (default: 0.5)
 *   data-gravity-elasticity             – spring elasticity           (default: 0.4)
 *
 * Material deformation (opt-in via `data-gravity-deformation`):
 *   data-gravity-deformation            – enable position-aware press deformation on focus
 *   data-gravity-deformation-strength   – intensity multiplier (default: 1.0)
 *   data-gravity-deformation-depth      – base scale reduction (default: 0.06)
 *
 * When deformation is active, the input deforms based on where in the element
 * the user clicks to focus it — center press causes uniform compression,
 * edge press causes directional compression, corner press causes diagonal
 * deformation with translation toward the click point.
 *
 * Works on: <input>, <textarea>, <select>, or any focusable wrapper.
 * Uses `focusin`/`focusout` (bubbling) so the attribute can be placed on a
 * wrapper div in frameworks that render the actual input as a child.
 */
export class InputComponent extends BaseComponent {
  static readonly selector = '[data-gravity-input]';
  private lastPointerPoint: { clientX: number; clientY: number } | null = null;

  constructor(element: HTMLElement, physics?: PhysicsService) {
    super(element, physics);
  }

  attach(): void {
    this.on(this.element, 'mousedown', (e) => {
      if (!this.shouldDeform()) return;
      const me = e as MouseEvent;
      this.lastPointerPoint = { clientX: me.clientX, clientY: me.clientY };
    });

    this.on(this.element, 'touchstart', (e) => {
      if (!this.shouldDeform()) return;
      const te = e as TouchEvent;
      const touch = te.touches[0];
      if (!touch) return;
      this.lastPointerPoint = { clientX: touch.clientX, clientY: touch.clientY };
    });

    this.on(this.element, 'focusin', () => {
      const cfg   = this.physicsConfig(DEFAULTS);
      const scale = this.numAttr('scale', DEFAULTS.scale);

      if (this.shouldDeform()) {
        // Deformation mode: use per-axis scale so that per-axis deformation
        // on press does not conflict with the uniform scale property.
        this.physics.animate(this.element, 'scaleX', scale, cfg);
        this.physics.animate(this.element, 'scaleY', scale, cfg);

        const rect = this.element.getBoundingClientRect();
        const clientX = this.lastPointerPoint?.clientX ?? rect.left + rect.width / 2;
        const clientY = this.lastPointerPoint?.clientY ?? rect.top + rect.height / 2;
        this.applyDeformation(clientX, clientY, cfg);
      } else {
        this.physics.animate(this.element, 'scale', scale, cfg);
      }

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', -1, cfg),
        );
      }
    });

    this.on(this.element, 'focusout', () => {
      const cfg = this.physicsConfig(DEFAULTS);

      if (this.shouldDeform()) {
        this.resetDeformation(cfg, 1);
        this.lastPointerPoint = null;
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

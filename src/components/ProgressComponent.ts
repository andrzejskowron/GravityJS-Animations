import { BaseComponent } from './BaseComponent';
import { PhysicsService } from '../core/PhysicsService';
import type { ComponentPhysicsConfig } from '../types';

const DEFAULTS: ComponentPhysicsConfig & { target: number } = {
  target: 0,
  bounce: 0.5,
  friction: 0.4,
  elasticity: 0.5,
};

/**
 * ProgressComponent – Physics width animation for progress / loading bars.
 *
 * Activate with:  `data-gravity-progress`  on the **track** element.
 *
 * The fill bar is the first child element, or the element itself when it
 * carries a role="progressbar" and has no child to fill.
 *
 * Target width resolution order (first wins):
 *   1. `data-gravity-target`  – explicit % value  (e.g. "75")
 *   2. `data-width`           – generic data attr  (e.g. "75")
 *   3. `aria-valuenow`        – a11y attribute     (e.g. "75")
 *   4. Falls back to 0 (no animation).
 *
 * Optional per-element overrides (data attributes):
 *   data-gravity-bounce      – spring bounce     (default: 0.5)
 *   data-gravity-friction    – spring friction   (default: 0.4)
 *   data-gravity-elasticity  – spring elasticity (default: 0.5)
 *
 * The fill starts at 0 % and springs to the target value on `attach()`.
 */
export class ProgressComponent extends BaseComponent {
  static readonly selector = '[data-gravity-progress]';

  constructor(element: HTMLElement, physics?: PhysicsService) {
    super(element, physics);
  }

  attach(): void {
    const cfg    = this.physicsConfig(DEFAULTS);
    const target = this.resolveTarget();
    const fill   = this.resolveFill();

    fill.style.width = '0%';
    this.physics.animate(fill, 'width', target, cfg);
  }

  private resolveTarget(): number {
    const explicit = this.element.getAttribute('data-gravity-target');
    if (explicit !== null) return parseFloat(explicit);

    const dataWidth = this.element.getAttribute('data-width');
    if (dataWidth !== null) return parseFloat(dataWidth);

    const ariaNow = this.element.getAttribute('aria-valuenow');
    if (ariaNow !== null) return parseFloat(ariaNow);

    return DEFAULTS.target;
  }

  private resolveFill(): HTMLElement {
    // If the element itself is the bar (role="progressbar" with no children)
    if (
      this.element.getAttribute('role') === 'progressbar' &&
      this.element.children.length === 0
    ) {
      return this.element;
    }
    return (this.element.firstElementChild as HTMLElement | null) ?? this.element;
  }
}


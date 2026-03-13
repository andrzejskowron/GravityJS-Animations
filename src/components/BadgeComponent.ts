import { BaseComponent } from './BaseComponent';
import { PhysicsService } from '../core/PhysicsService';
import type { ComponentPhysicsConfig } from '../types';
import { UpdateFrequency } from '../core/PhysicsBody';

const DEFAULTS: ComponentPhysicsConfig & { scale: number; interval: number } = {
  scale: 1.2,
  interval: 2000,
  bounce: 0.8,
  friction: 0.15,
  elasticity: 0.8,
};

/**
 * BadgeComponent – Autonomous physics pulse loop for badge / chip elements.
 *
 * Activate with:  `data-gravity-badge`
 *
 * Optional per-element overrides (data attributes):
 *   data-gravity-scale       – pulse peak scale     (default: 1.2)
 *   data-gravity-interval    – pulse interval in ms (default: 2000)
 *   data-gravity-bounce      – spring bounce        (default: 0.8)
 *   data-gravity-friction    – spring friction      (default: 0.15)
 *   data-gravity-elasticity  – spring elasticity    (default: 0.8)
 *
 * `destroy()` clears the interval and cancels any running animation.
 */
export class BadgeComponent extends BaseComponent {
  static readonly selector = '[data-gravity-badge]';

  private pulseHandle: ReturnType<typeof setInterval> | null = null;

  constructor(element: HTMLElement, physics?: PhysicsService) {
    super(element, physics);
  }

  attach(): void {
    this.pulse();

    const interval = this.numAttr('interval', DEFAULTS.interval);
    this.pulseHandle = setInterval(() => this.pulse(), interval);

    this.startTextCounterScale();
  }

  private pulse(): void {
    const cfg   = this.physicsConfig(DEFAULTS);
    const scale = this.numAttr('scale', DEFAULTS.scale);

    // Pop up …
    this.physics.animate(this.element, 'scale', scale, cfg);

    if (this.shouldAnimateText()) {
      this.getTextNodes(this.element).forEach(el =>
        this.physics.animate(el, 'translateY', -3, cfg),
      );
    }

    // … then settle back after half the interval (or 400 ms minimum)
    const interval = this.numAttr('interval', DEFAULTS.interval);
    const settleAt = Math.max(400, interval * 0.4);
    setTimeout(() => {
      this.physics.animate(this.element, 'scale', 1, cfg);

      if (this.shouldAnimateText()) {
        this.getTextNodes(this.element).forEach(el =>
          this.physics.animate(el, 'translateY', 0, cfg),
        );
      }
    }, settleAt);
  }

  override destroy(): void {
    if (this.pulseHandle !== null) {
      clearInterval(this.pulseHandle);
      this.pulseHandle = null;
    }
    super.destroy();
  }
}
import { BaseComponent } from './BaseComponent';
import { PhysicsService } from '../core/PhysicsService';
import type { ComponentPhysicsConfig } from '../types';

const DEFAULTS: ComponentPhysicsConfig & { distance: number; delay: number } = {
  distance: 100,
  delay: 0,
  bounce: 0.65,
  friction: 0.25,
  elasticity: 0.65,
};

/**
 * AlertComponent – Physics slide-in for alert / toast / snackbar elements.
 *
 * Activate with:  `data-gravity-alert`
 *
 * Optional per-element overrides (data attributes):
 *   data-gravity-direction   – `"left"` (default) | `"right"` | `"top"` | `"bottom"`
 *   data-gravity-distance    – off-screen start distance in px  (default: 100)
 *   data-gravity-delay       – attach delay in ms               (default: 0)
 *   data-gravity-bounce      – spring bounce                    (default: 0.65)
 *   data-gravity-friction    – spring friction                  (default: 0.25)
 *   data-gravity-elasticity  – spring elasticity                (default: 0.65)
 *
 * The element starts hidden (opacity 0, translated) and springs into its
 * natural position on `attach()`.
 */
export class AlertComponent extends BaseComponent {
  static readonly selector = '[data-gravity-alert]';

  private delayHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(element: HTMLElement, physics?: PhysicsService) {
    super(element, physics);
  }

  attach(): void {
    const cfg       = this.physicsConfig(DEFAULTS);
    const distance  = this.numAttr('distance',  DEFAULTS.distance);
    const delay     = this.numAttr('delay',     DEFAULTS.delay);
    const direction = this.strAttr('direction', 'left');

    const { startX, startY } = this.resolveStart(direction, distance);

    this.element.style.opacity   = '0';
    if (startX !== 0) this.element.style.transform = `translateX(${startX}px)`;
    if (startY !== 0) this.element.style.transform = `translateY(${startY}px)`;

    this.delayHandle = setTimeout(() => {
      this.delayHandle = null;
      if (startX !== 0) this.physics.animate(this.element, 'translateX', 0, cfg);
      if (startY !== 0) this.physics.animate(this.element, 'translateY', 0, cfg);
      this.physics.animate(this.element, 'opacity', 1, cfg);
    }, delay);
  }

  private resolveStart(direction: string, distance: number): { startX: number; startY: number } {
    switch (direction) {
      case 'right':  return { startX:  distance, startY: 0 };
      case 'top':    return { startX: 0, startY: -distance };
      case 'bottom': return { startX: 0, startY:  distance };
      default:       return { startX: -distance, startY: 0 };
    }
  }

  override destroy(): void {
    if (this.delayHandle !== null) {
      clearTimeout(this.delayHandle);
      this.delayHandle = null;
    }
    super.destroy();
  }
}


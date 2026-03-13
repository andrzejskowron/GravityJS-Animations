import { BaseComponent } from './BaseComponent';
import { PhysicsService } from '../core/PhysicsService';
import type { ComponentPhysicsConfig } from '../types';

const DEFAULTS: ComponentPhysicsConfig & { distance: number; delay: number } = {
  distance: 120,
  delay: 0,
  bounce: 0.7,
  friction: 0.2,
  elasticity: 0.7,
};

/**
 * BannerComponent – Physics slide-in animation for banner / notification elements.
 *
 * Activate with:  `data-gravity-banner`
 *
 * Optional per-element overrides (data attributes):
 *   data-gravity-direction   – `"left"` (default) or `"right"`
 *   data-gravity-distance    – off-screen start distance in px   (default: 120)
 *   data-gravity-delay       – attach delay in ms                (default: 0)
 *   data-gravity-bounce      – spring bounce                     (default: 0.7)
 *   data-gravity-friction    – spring friction                   (default: 0.2)
 *   data-gravity-elasticity  – spring elasticity                 (default: 0.7)
 *
 * The banner starts hidden (opacity 0, translated off-screen) and springs
 * into its natural position on `attach()`.
 */
export class BannerComponent extends BaseComponent {
  static readonly selector = '[data-gravity-banner]';

  private delayHandle: ReturnType<typeof setTimeout> | null = null;

  constructor(element: HTMLElement, physics?: PhysicsService) {
    super(element, physics);
  }

  attach(): void {
    const cfg       = this.physicsConfig(DEFAULTS);
    const distance  = this.numAttr('distance',  DEFAULTS.distance);
    const delay     = this.numAttr('delay',     DEFAULTS.delay);
    const direction = this.strAttr('direction', 'left');
    const startX    = direction === 'right' ? distance : -distance;

    // Park the element off-screen before the delay fires
    this.element.style.opacity   = '0';
    this.element.style.transform = `translateX(${startX}px)`;

    this.delayHandle = setTimeout(() => {
      this.delayHandle = null;
      this.physics.animate(this.element, 'translateX', 0, cfg);
      this.physics.animate(this.element, 'opacity',    1, cfg);
    }, delay);
  }

  override destroy(): void {
    if (this.delayHandle !== null) {
      clearTimeout(this.delayHandle);
      this.delayHandle = null;
    }
    super.destroy();
  }
}


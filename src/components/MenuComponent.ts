import { BaseComponent } from './BaseComponent';
import { PhysicsService } from '../core/PhysicsService';
import type { ComponentPhysicsConfig } from '../types';

const DEFAULTS: ComponentPhysicsConfig & { scale: number } = {
  scale: 1.06,
  bounce: 0.5,
  friction: 0.35,
  elasticity: 0.5,
};

/**
 * MenuComponent – Physics hover feedback for navigation menu items.
 *
 * Activate with:  `data-gravity-menu`  on any menu item element.
 *
 * Optional per-element overrides (data attributes):
 *   data-gravity-scale       – hover scale target  (default: 1.06)
 *   data-gravity-bounce      – spring bounce       (default: 0.5)
 *   data-gravity-friction    – spring friction     (default: 0.35)
 *   data-gravity-elasticity  – spring elasticity   (default: 0.5)
 *
 * Works on: <li>, <a>, <div>, or any wrapper – framework-agnostic.
 *
 * Dropdown support:
 *   If the parent element contains a `.menu-dropdown` sibling, hovering the
 *   parent item reveals it with a spring-animated opacity + scaleY reveal.
 *   Listeners are placed on the parent so that moving the cursor from the
 *   link into the dropdown does not prematurely close it.
 */
export class MenuComponent extends BaseComponent {
  static readonly selector = '[data-gravity-menu]';

  /** The sibling dropdown element, if one exists inside the parent item. */
  private dropdown: HTMLElement | null = null;

  constructor(element: HTMLElement, physics?: PhysicsService) {
    super(element, physics);
  }

  attach(): void {
    const parent   = this.element.parentElement;
    const dropdown = parent?.querySelector<HTMLElement>('.menu-dropdown') ?? null;
    this.dropdown  = dropdown;

    if (dropdown) {
      // Initialise the dropdown's inline transform so PhysicsService reads
      // scaleY = 0 as the starting value (its default fallback is 1).
      dropdown.style.transform    = 'scaleY(0)';
      dropdown.style.pointerEvents = 'none';

      // Listen on the parent menu-item so that moving the cursor from the
      // <a> into the dropdown doesn't fire a spurious mouseleave.
      const menuItem = parent as HTMLElement;

      this.on(menuItem, 'mouseenter', () => {
        const cfg   = this.physicsConfig(DEFAULTS);
        const scale = this.numAttr('scale', DEFAULTS.scale);
        // Animate the link itself
        this.physics.animate(this.element, 'scale', scale, cfg);
        // Reveal the dropdown via physics
        dropdown.style.pointerEvents = 'auto';
        this.physics.animate(dropdown, 'opacity', 1, cfg);
        this.physics.animate(dropdown, 'scaleY',  1, cfg);

        if (this.shouldAnimateText()) {
          this.getTextNodes(this.element).forEach(el =>
            this.physics.animate(el, 'translateY', -2, cfg),
          );
        }
      });

      this.on(menuItem, 'mouseleave', () => {
        const cfg = this.physicsConfig(DEFAULTS);
        // Return the link to rest
        this.physics.animate(this.element, 'scale', 1, cfg);
        // Collapse the dropdown via physics; disable pointer events immediately
        // so underlying content isn't blocked during the closing animation.
        dropdown.style.pointerEvents = 'none';
        this.physics.animate(dropdown, 'opacity', 0, cfg);
        this.physics.animate(dropdown, 'scaleY',  0, cfg);

        if (this.shouldAnimateText()) {
          this.getTextNodes(this.element).forEach(el =>
            this.physics.animate(el, 'translateY', 0, cfg),
          );
        }
      });

      // Press feedback on the link itself
      this.on(this.element, 'mousedown', () => {
        const cfg = this.physicsConfig(DEFAULTS);
        this.physics.animate(this.element, 'scale', 0.96, cfg);

        if (this.shouldAnimateText()) {
          this.getTextNodes(this.element).forEach(el =>
            this.physics.animate(el, 'translateY', 2, cfg),
          );
        }
      });

      this.on(this.element, 'mouseup', () => {
        const cfg   = this.physicsConfig(DEFAULTS);
        const scale = this.numAttr('scale', DEFAULTS.scale);
        this.physics.animate(this.element, 'scale', scale, cfg);

        if (this.shouldAnimateText()) {
          this.getTextNodes(this.element).forEach(el =>
            this.physics.animate(el, 'translateY', -2, cfg),
          );
        }
      });
    } else {
      // No dropdown – link-only hover behaviour.
      this.on(this.element, 'mouseenter', () => {
        const cfg   = this.physicsConfig(DEFAULTS);
        const scale = this.numAttr('scale', DEFAULTS.scale);
        this.physics.animate(this.element, 'scale', scale, cfg);

        if (this.shouldAnimateText()) {
          this.getTextNodes(this.element).forEach(el =>
            this.physics.animate(el, 'translateY', -2, cfg),
          );
        }
      });

      this.on(this.element, 'mouseleave', () => {
        const cfg = this.physicsConfig(DEFAULTS);
        this.physics.animate(this.element, 'scale', 1, cfg);

        if (this.shouldAnimateText()) {
          this.getTextNodes(this.element).forEach(el =>
            this.physics.animate(el, 'translateY', 0, cfg),
          );
        }
      });

      this.on(this.element, 'mousedown', () => {
        const cfg = this.physicsConfig(DEFAULTS);
        this.physics.animate(this.element, 'scale', 0.96, cfg);

        if (this.shouldAnimateText()) {
          this.getTextNodes(this.element).forEach(el =>
            this.physics.animate(el, 'translateY', 2, cfg),
          );
        }
      });

      this.on(this.element, 'mouseup', () => {
        const cfg   = this.physicsConfig(DEFAULTS);
        const scale = this.numAttr('scale', DEFAULTS.scale);
        this.physics.animate(this.element, 'scale', scale, cfg);

        if (this.shouldAnimateText()) {
          this.getTextNodes(this.element).forEach(el =>
            this.physics.animate(el, 'translateY', -2, cfg),
          );
        }
      });
    }

    this.startTextCounterScale();
  }

  override destroy(): void {
    if (this.dropdown) {
      this.physics.stop(this.dropdown);
    }
    super.destroy();
  }
}

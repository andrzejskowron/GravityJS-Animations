import { BaseComponent } from './BaseComponent';
import { PhysicsService } from '../core/PhysicsService';
import type { ComponentPhysicsConfig } from '../types';

const DEFAULTS: ComponentPhysicsConfig = {
  bounce: 0.6,
  friction: 0.3,
  elasticity: 0.6,
};

/**
 * AccordionComponent – Physics-driven expand / collapse for accordion items.
 *
 * Activate with:  `data-gravity-accordion`  on the **item container** element.
 *
 * Header detection (first match wins):
 *   1. Child with `data-gravity-accordion-header`
 *   2. Child `<button>` or `[role="button"]`
 *   3. First direct child element
 *
 * Content detection (first match wins):
 *   1. Child with `data-gravity-accordion-content`
 *   2. Child matching `.accordion-content, [role="region"]`
 *   3. Second direct child element
 *
 * Optional per-element overrides:
 *   data-gravity-bounce / friction / elasticity
 *
 * Works framework-agnostically – put the attribute on the wrapper, let the
 * component discover the inner elements via standard DOM traversal.
 */
export class AccordionComponent extends BaseComponent {
  static readonly selector = '[data-gravity-accordion]';

  constructor(element: HTMLElement, physics?: PhysicsService) {
    super(element, physics);
  }

  attach(): void {
    const header  = this.findHeader();
    const content = this.findContent();
    if (!header || !content) return;

    this.on(header, 'click', () => {
      const cfg      = this.physicsConfig(DEFAULTS);
      const isActive = this.element.classList.contains('active');

      if (isActive) {
        this.physics.animate(content, 'maxHeight', 0, cfg);
        this.element.classList.remove('active');
      } else {
        const body      = content.firstElementChild as HTMLElement | null;
        const targetH   = (body?.offsetHeight ?? 200) + 36;
        this.physics.animate(content, 'maxHeight', targetH, cfg);
        this.element.classList.add('active');
      }
    });
  }

  private findHeader(): HTMLElement | null {
    return (
      this.element.querySelector<HTMLElement>('[data-gravity-accordion-header]') ??
      this.element.querySelector<HTMLElement>('button, [role="button"]') ??
      (this.element.firstElementChild as HTMLElement | null)
    );
  }

  private findContent(): HTMLElement | null {
    return (
      this.element.querySelector<HTMLElement>('[data-gravity-accordion-content]') ??
      this.element.querySelector<HTMLElement>('.accordion-content, [role="region"]') ??
      (this.element.children[1] as HTMLElement | undefined ?? null)
    );
  }
}


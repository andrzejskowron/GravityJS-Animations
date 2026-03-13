import { BaseComponent } from './BaseComponent';
import { PhysicsService } from '../core/PhysicsService';
import type { ComponentPhysicsConfig, MaterialHint } from '../types';
import { UpdateFrequency } from '../core/PhysicsBody';

/** How far (px × strength) elements are offset from their natural position before animating in. */
const ENTER_OFFSET_PX = 80;

const VALID_MATERIALS = new Set<MaterialHint>(['rigid', 'metal', 'rubber', 'jelly']);

type TriggerVariant = 'viewport' | 'half' | 'previous' | 'custom' | 'progress' | 'easing' | 'bounce' | 'spring';

const DEFAULTS: ComponentPhysicsConfig & {
  trigger: TriggerVariant;
  offset: number;
  strength: number;
  direction: 'x' | 'y' | 'both';
} = {
  trigger: 'viewport',
  offset: 0,
  strength: 0.5,
  direction: 'y',
  bounce: 0.5,
  friction: 0.25,
  elasticity: 0.65,
};

/**
 * Per-trigger physics overrides applied on top of DEFAULTS.
 * easing  → overdamped / smooth feel
 * bounce  → underdamped / overshooting
 * spring  → very underdamped / oscillating
 */
const TRIGGER_PHYSICS: Record<TriggerVariant, Partial<ComponentPhysicsConfig>> = {
  viewport: {},
  half:     {},
  previous: {},
  custom:   {},
  progress: {},
  easing:   { bounce: 0.2,  friction: 0.55, elasticity: 0.85 },
  bounce:   { bounce: 0.9,  friction: 0.08, elasticity: 0.35 },
  spring:   { bounce: 0.95, friction: 0.04, elasticity: 0.25 },
};

/**
 * ScrollAnimationComponent – Physics-driven scroll-triggered animations.
 *
 * Activate with:  `data-gravity-scroll`
 *
 * Optional per-element overrides (data-gravity-scroll-* attributes):
 *   data-gravity-scroll-trigger   – trigger variant (default: 'viewport'):
 *     'viewport'  - animate when element enters viewport
 *     'half'      - animate when element is 75 % into the viewport
 *     'previous'  - animate when previous sibling is fully visible
 *     'custom'    - custom trigger point (data-gravity-scroll-offset)
 *     'progress'  - continuously track scroll progress (parallax)
 *     'easing'    - smooth / overdamped entrance
 *     'bounce'    - bouncy / underdamped entrance
 *     'spring'    - highly oscillating spring entrance
 *   data-gravity-scroll-offset    - px offset for 'custom' trigger (default: 0)
 *   data-gravity-scroll-strength  - entry offset multiplier 0–1 (default: 0.5)
 *   data-gravity-scroll-direction - 'x', 'y', or 'both' (default: 'y')
 *   data-gravity-scroll-material  - material hint (rigid|metal|rubber|jelly)
 *
 * Works on: <section>, <div>, <article>, or any block element.
 * Tip: combine with `data-gravity-motion-blur` for motion-blur feedback.
 */
export class ScrollAnimationComponent extends BaseComponent {
  static readonly selector = '[data-gravity-scroll]';

  /** True once the entrance animation has been triggered (prevents re-firing). */
  private triggered = false;

  constructor(element: HTMLElement, physics?: PhysicsService) {
    super(element, physics);
  }

  attach(): void {
    const trigger   = this.scrollStrAttr('trigger',   DEFAULTS.trigger) as TriggerVariant;
    const strength  = this.scrollNumAttr('strength',  DEFAULTS.strength);
    const direction = this.scrollStrAttr('direction', DEFAULTS.direction) as 'x' | 'y' | 'both';

    // Place element in its "hidden" starting state – offset from natural position.
    // All triggers except 'progress' use physics animation, so apply initial offset.
    if (trigger !== 'progress') {
      this.applyInitialOffset(strength, direction);
    }

    this.setupScrollListener();
  }

  /**
   * Offset the element from its natural layout position so it can slide in.
   * Uses inline style – PhysicsService will take over once triggerEntrance fires.
   */
  private applyInitialOffset(strength: number, direction: 'x' | 'y' | 'both'): void {
    const offset = strength * ENTER_OFFSET_PX;
    const parts: string[] = [];
    if (direction === 'y' || direction === 'both') parts.push(`translateY(${offset.toFixed(1)}px)`);
    if (direction === 'x' || direction === 'both') parts.push(`translateX(${offset.toFixed(1)}px)`);
    this.element.style.transform = parts.join(' ');
    this.element.style.opacity   = '0';
  }

  private setupScrollListener(): void {
    const trigger   = this.scrollStrAttr('trigger',   DEFAULTS.trigger) as TriggerVariant;
    const offset    = this.scrollNumAttr('offset',    DEFAULTS.offset);
    const strength  = this.scrollNumAttr('strength',  DEFAULTS.strength);
    const direction = this.scrollStrAttr('direction', DEFAULTS.direction) as 'x' | 'y' | 'both';

    const check = () => {
      // Entrance triggers fire once; progress is always continuous.
      if (this.triggered && trigger !== 'progress') return;

      const rect         = this.element.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      switch (trigger) {
        case 'viewport':
          // Trigger when element enters viewport
          if (rect.top < windowHeight && rect.bottom > 0 && !this.triggered) {
            this.triggerEntrance(trigger, direction);
          }
          break;

        case 'half':
          // Trigger when element is half visible in viewport
          if (rect.top < windowHeight * 0.5 && rect.bottom > windowHeight * 0.5 && !this.triggered) {
            this.triggerEntrance(trigger, direction);
          }
          break;

        case 'previous': {
          // Trigger when previous element is fully visible
          const prev = this.element.previousElementSibling as HTMLElement | null;
          if (prev && prev.getBoundingClientRect().bottom <= windowHeight && !this.triggered) {
            this.triggerEntrance(trigger, direction);
          }
          break;
        }

        case 'custom':
          // Trigger when element is within custom offset from viewport
          if (rect.top < windowHeight - offset && !this.triggered) {
            this.triggerEntrance(trigger, direction);
          }
          break;

        case 'easing':
        case 'bounce':
        case 'spring':
          // Trigger when element enters viewport
          if (rect.top < windowHeight && rect.bottom > 0 && !this.triggered) {
            this.triggerEntrance(trigger, direction);
          }
          break;

        case 'progress':
          this.updateProgress(rect, windowHeight, strength, direction);
          break;
      }
    };

    // Fire once immediately in case the element is already in view on load.
    check();
    this.on(window, 'scroll', check);
  }

  /**
   * Spring-animate the element from its offset starting position to its
   * natural layout position (translateX/Y → 0, opacity → 1).
   * Physics preset is selected per trigger variant.
   */
  private triggerEntrance(trigger: TriggerVariant, direction: 'x' | 'y' | 'both'): void {
    if (this.triggered) return;
    this.triggered = true;

    const cfg = this.scrollPhysicsConfig({ ...DEFAULTS, ...TRIGGER_PHYSICS[trigger] });

    // Animate the main element
    if (direction === 'y' || direction === 'both') {
      this.physics.animate(this.element, 'translateY', 0, cfg);
    }
    if (direction === 'x' || direction === 'both') {
      this.physics.animate(this.element, 'translateX', 0, cfg);
    }
    this.physics.animate(this.element, 'opacity', 1, cfg);
  }

  /**
   * For the 'progress' trigger: continuously map how far the element has
   * scrolled through the viewport to a translateY offset and opacity.
   * Values are written directly (no spring) so they track the scroll cursor.
   */
  private updateProgress(
    rect: DOMRect,
    windowHeight: number,
    strength: number,
    direction: 'x' | 'y' | 'both',
  ): void {
    // 0 when element top is at viewport bottom; 1 when element top reaches viewport top.
    const progress = Math.max(0, Math.min(1, 1 - rect.top / windowHeight));
    const offset   = (1 - progress) * strength * ENTER_OFFSET_PX;

    const parts: string[] = [];
    if (direction === 'y' || direction === 'both') parts.push(`translateY(${offset.toFixed(1)}px)`);
    if (direction === 'x' || direction === 'both') parts.push(`translateX(${offset.toFixed(1)}px)`);
    this.element.style.transform = parts.join(' ');
    // Fade in over the first half of progress to avoid a hard pop-in.
    this.element.style.opacity = Math.min(1, progress * 2).toFixed(3);

  }

  //  data-gravity-scroll-* attribute helpers

  /** Read a `data-gravity-scroll-{name}` attribute, falling back to `defaultValue`. */
  private scrollStrAttr(name: string, defaultValue: string): string {
    return this.element.getAttribute(`data-gravity-scroll-${name}`) ?? defaultValue;
  }

  /** Read a numeric `data-gravity-scroll-{name}` attribute, falling back to `defaultValue`. */
  private scrollNumAttr(name: string, defaultValue: number): number {
    const raw    = this.element.getAttribute(`data-gravity-scroll-${name}`);
    const parsed = raw !== null ? parseFloat(raw) : NaN;
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Build a physics config that additionally honours `data-gravity-scroll-material`
   * (takes precedence over the generic `data-gravity-material`).
   */
  private scrollPhysicsConfig(defaults: ComponentPhysicsConfig): ComponentPhysicsConfig {
    const base       = this.physicsConfig(defaults);
    const scrollMat  = this.element.getAttribute('data-gravity-scroll-material');
    if (scrollMat && VALID_MATERIALS.has(scrollMat as MaterialHint)) {
      return { ...base, material: scrollMat as MaterialHint };
    }
    return base;
  }

  destroy(): void {
    super.destroy();
    // Restore natural layout styles so the element is usable after teardown.
    this.element.style.transform = '';
    this.element.style.opacity   = '';
  }
}
import { PhysicsService } from '../core/PhysicsService';
import { ContourDeformationService } from '../core/ContourDeformationService';
import { computeDeformation, type DeformationMode } from '../core/deformation';
import type { ComponentPhysicsConfig, MaterialHint } from '../types';

const VALID_MATERIALS = new Set<MaterialHint>(['rigid', 'metal', 'rubber', 'jelly']);
const VALID_DEFORMATION_MODES = new Set<DeformationMode>(['collapse', 'spread']);
type DeformationTrigger = 'click' | 'hover';
const VALID_DEFORMATION_TRIGGERS = new Set<DeformationTrigger>(['click', 'hover']);
type FixedDeformationZone =
  | 'center'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'corner'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';
const VALID_FIXED_DEFORMATION_ZONES = new Set<FixedDeformationZone>([
  'center',
  'left',
  'right',
  'top',
  'bottom',
  'corner',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]);
const FIXED_DEFORMATION_INSET = 0.12;

type EventTargetLike = HTMLElement | Document | Window;

interface ListenerEntry {
  target: EventTargetLike;
  event: string;
  handler: EventListenerOrEventListenerObject;
}

/**
 * BaseComponent – Abstract foundation for all GravityJS UI components.
 *
 * Subclasses implement `attach()` to bind physics behaviours to the element.
 * The base class tracks every registered listener so that `destroy()` can
 * perform a clean teardown with no leaks.
 *
 * Config is intentionally read fresh from data attributes on every interaction
 * so that live demos (and framework reactivity) can update attributes and see
 * immediate results without re-initialisation.
 */
export abstract class BaseComponent {
  protected readonly physics: PhysicsService;
  protected readonly contourDeformation: ContourDeformationService;
  private readonly _listeners: ListenerEntry[] = [];
  private _counterTextNodes: HTMLElement[] = [];
  private _transformOriginResetTimer: number | null = null;
  private _naturalBorderRadius: number | null = null;

  constructor(
    protected readonly element: HTMLElement,
    physics?: PhysicsService,
  ) {
    this.physics = physics ?? PhysicsService.getInstance();
    this.contourDeformation = ContourDeformationService.getInstance();
  }

  /** Bind physics behaviours to the element. Called once by `initComponents`. */
  abstract attach(): void;

  /** Remove all event listeners and cancel running animations. */
  destroy(): void {
    this._listeners.forEach(({ target, event, handler }) =>
      target.removeEventListener(event, handler),
    );
    this._listeners.length = 0;
    this.physics.stop(this.element);
    this.contourDeformation.destroy(this.element);
    this.clearTransformOriginResetTimer();
    this.element.style.transformOrigin = '';
    if (this._naturalBorderRadius !== null) {
      this.element.style.borderRadius = `${this._naturalBorderRadius.toFixed(2)}px`;
    }

    // Counter-scale cleanup — unwrap any spans injected by getOrWrapTextNodes.
    this._counterTextNodes.forEach(el => {
      el.style.transform = '';
      if ((el as HTMLElement).dataset?.gravityTextWrap === 'true') {
        const parent = el.parentElement;
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        }
      }
    });
    this._counterTextNodes = [];
  }

  //  Helpers

  /** Register and track an event listener for automatic cleanup. */
  protected on(
    target: EventTargetLike,
    event: string,
    handler: EventListenerOrEventListenerObject,
  ): void {
    target.addEventListener(event, handler);
    this._listeners.push({ target, event, handler });
  }

  /** Read a numeric `data-gravity-{name}` attribute, falling back to `defaultValue`. */
  protected numAttr(name: string, defaultValue: number): number {
    const raw = this.element.getAttribute(`data-gravity-${name}`);
    const parsed = raw !== null ? parseFloat(raw) : NaN;
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /** Read a string `data-gravity-{name}` attribute, falling back to `defaultValue`. */
  protected strAttr(name: string, defaultValue: string): string {
    return this.element.getAttribute(`data-gravity-${name}`) ?? defaultValue;
  }

  /**
   * Returns `true` when `data-gravity-animate-text` is present on the element.
   * Text animation is opt-in and only meaningful for components that explicitly
   * check it (ButtonComponent, MenuComponent, InputComponent, BadgeComponent).
   */
  protected shouldAnimateText(): boolean {
    return this.element.hasAttribute('data-gravity-animate-text');
  }

  /**
   * Returns `true` when `data-gravity-deformation` is present on the element.
   * Deformation mode is opt-in; when active, press events drive per-axis
   * scaleX / scaleY / translateX / translateY animations based on the pointer
   * position within the element, producing physically-motivated material
   * deformation (centre press → uniform compression, edge press → directional
   * compression, corner press → diagonal deformation).
   *
   * Optional tuning attributes:
   *   `data-gravity-deformation-strength` – overall intensity (default: 1.0)
   *   `data-gravity-deformation-depth`    – base scale reduction (default: 0.06)
   *   `data-gravity-deformation-zone`     – optional fixed hotspot override
   */
  protected shouldDeform(): boolean {
    return this.element.hasAttribute('data-gravity-deformation');
  }

  /** Deformation family to use when `data-gravity-deformation` is enabled. */
  protected deformationMode(): DeformationMode {
    const raw = this.strAttr('deformation-mode', 'collapse');
    return VALID_DEFORMATION_MODES.has(raw as DeformationMode)
      ? (raw as DeformationMode)
      : 'collapse';
  }

  /** Whether deformation is driven by click/press or by pointer hover. */
  protected deformationTrigger(): DeformationTrigger {
    const raw = this.strAttr('deformation-trigger', 'click');
    return VALID_DEFORMATION_TRIGGERS.has(raw as DeformationTrigger)
      ? (raw as DeformationTrigger)
      : 'click';
  }

  /** Convenience helper for mouse-driven live deformation on hover-capable components. */
  protected isHoverDeformationTrigger(): boolean {
    return this.shouldDeform() && this.deformationTrigger() === 'hover';
  }

  /**
   * Animate the element toward a position-dependent deformed state.
   * Call this inside a `mousedown` / `touchstart` handler.
   *
   * When deformation mode is active the component must use `scaleX`/`scaleY`
   * for ALL scale operations (hover included) — mixing `scale` and
   * `scaleX`/`scaleY` in the same element causes TransformState conflicts
   * because the per-axis properties shadow the uniform scale in
   * `buildTransform()`.
   *
   * Overall transform feedback remains on `PhysicsService`; real border/outline
   * bending is delegated to `ContourDeformationService`.
   *
   * @param clientX - Viewport X coordinate of the press.
   * @param clientY - Viewport Y coordinate of the press.
   * @param cfg     - Physics spring config for the animation.
   */
  protected applyDeformation(
    clientX: number,
    clientY: number,
    cfg: ComponentPhysicsConfig,
  ): void {
    const rect = this.element.getBoundingClientRect();
    const strength = this.numAttr('deformation-strength', 1.0);
    const depth = this.numAttr('deformation-depth', 0.06);
    const curvature = Math.max(0, this.numAttr('deformation-curvature', 1.0));
    const contactPoint = this.resolveDeformationContactPoint(rect, clientX, clientY);
    this.setDeformationOrigin(rect, contactPoint.clientX, contactPoint.clientY);
    const result = computeDeformation(
      rect,
      contactPoint.clientX,
      contactPoint.clientY,
      strength,
      depth,
      {
        mode: this.deformationMode(),
        curvature,
      },
    );
    this.physics.animate(this.element, 'scaleX', result.scaleX, cfg);
    this.physics.animate(this.element, 'scaleY', result.scaleY, cfg);
    this.physics.animate(this.element, 'translateX', result.translateX, cfg);
    this.physics.animate(this.element, 'translateY', result.translateY, cfg);
    this.contourDeformation.deform(
      this.element,
      this.getNaturalBorderRadius(),
      result.contour,
      result.mode,
      cfg,
    );
  }

  /**
   * Spring the element back from a deformed state.
   * Call this inside `mouseup` / `touchend` handlers.
   *
   * @param cfg         - Physics spring config for the animation.
   * @param returnScale - Target scaleX/scaleY after release.
   *                      Pass the hover scale when the cursor is still over the
   *                      element, or 1 when it has left (touch, mouseleave).
   */
  protected resetDeformation(
    cfg: ComponentPhysicsConfig,
    returnScale = 1,
  ): void {
    this.physics.animate(this.element, 'scaleX', returnScale, cfg);
    this.physics.animate(this.element, 'scaleY', returnScale, cfg);
    this.physics.animate(this.element, 'translateX', 0,           cfg);
    this.physics.animate(this.element, 'translateY', 0,           cfg);
    this.contourDeformation.reset(this.element, this.getNaturalBorderRadius(), cfg);
    this.scheduleTransformOriginReset();
  }

  private getNaturalBorderRadius(): number {
    if (this._naturalBorderRadius === null) {
      this._naturalBorderRadius = parseFloat(getComputedStyle(this.element).borderRadius) || 0;
    }
    return this._naturalBorderRadius;
  }

  private fixedDeformationZone(): FixedDeformationZone | null {
    const raw = this.strAttr('deformation-zone', '').trim().toLowerCase();
    return VALID_FIXED_DEFORMATION_ZONES.has(raw as FixedDeformationZone)
      ? raw as FixedDeformationZone
      : null;
  }

  private resolveDeformationContactPoint(
    rect: DOMRect,
    clientX: number,
    clientY: number,
  ): { clientX: number; clientY: number } {
    const fixedZone = this.fixedDeformationZone();
    if (!fixedZone) {
      return { clientX, clientY };
    }

    const edge = FIXED_DEFORMATION_INSET;
    const farEdge = 1 - FIXED_DEFORMATION_INSET;
    const center = 0.5;
    const centerX = rect.left + rect.width * center;
    const centerY = rect.top + rect.height * center;

    let nx = center;
    let ny = center;

    switch (fixedZone) {
      case 'center':
        break;
      case 'left':
        nx = edge;
        break;
      case 'right':
        nx = farEdge;
        break;
      case 'top':
        ny = edge;
        break;
      case 'bottom':
        ny = farEdge;
        break;
      case 'top-left':
        nx = edge;
        ny = edge;
        break;
      case 'top-right':
        nx = farEdge;
        ny = edge;
        break;
      case 'bottom-left':
        nx = edge;
        ny = farEdge;
        break;
      case 'bottom-right':
        nx = farEdge;
        ny = farEdge;
        break;
      case 'corner':
        nx = clientX <= centerX ? edge : farEdge;
        ny = clientY <= centerY ? edge : farEdge;
        break;
    }

    return {
      clientX: rect.left + rect.width * nx,
      clientY: rect.top + rect.height * ny,
    };
  }

  private setDeformationOrigin(rect: DOMRect, clientX: number, clientY: number): void {
    this.clearTransformOriginResetTimer();

    const xPercent = rect.width > 0
      ? Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
      : 50;
    const yPercent = rect.height > 0
      ? Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
      : 50;

    this.element.style.transformOrigin = `${xPercent.toFixed(2)}% ${yPercent.toFixed(2)}%`;
  }

  private scheduleTransformOriginReset(): void {
    this.clearTransformOriginResetTimer();
    this._transformOriginResetTimer = window.setTimeout(() => {
      this.element.style.transformOrigin = '50% 50%';
      this._transformOriginResetTimer = null;
    }, 220);
  }

  private clearTransformOriginResetTimer(): void {
    if (this._transformOriginResetTimer !== null) {
      window.clearTimeout(this._transformOriginResetTimer);
      this._transformOriginResetTimer = null;
    }
  }

  /**
   * Walk `element`'s subtree and collect the immediate parent elements of
   * non-empty text nodes, **excluding the host element itself**.
   * This ensures the returned elements are genuine child wrappers (e.g. `<span>`)
   * whose own `transform` can be animated without conflicting with the host's
   * physics-driven transform.  Results are deduplicated.
   */
  protected getTextNodes(element: HTMLElement): HTMLElement[] {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    const seen   = new Set<HTMLElement>();
    let   node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = (node as Text).parentElement;
      if (parent && parent !== element && node.textContent?.trim()) {
        seen.add(parent);
      }
    }
    return [...seen];
  }

  /**
   * Collect all text-bearing children of `element` as transformable elements.
   * Direct text nodes are wrapped in a `<span data-gravity-text-wrap="true">`
   * so that CSS transforms can be applied to them.  Existing child elements
   * that contain text are returned as-is (same as `getTextNodes`).
   */
  protected getOrWrapTextNodes(element: HTMLElement): HTMLElement[] {
    const results: HTMLElement[] = [...this.getTextNodes(element)];

    // Wrap any bare direct text nodes so they can receive transforms.
    const toWrap: Text[] = [];
    element.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        toWrap.push(node as Text);
      }
    });
    for (const textNode of toWrap) {
      const span = document.createElement('span');
      span.dataset.gravityTextWrap = 'true';
      // `inline-block` is required: CSS transforms are not reliably applied to
      // `display: inline` elements across all browser rendering paths.
      span.style.display       = 'inline-block';
      span.style.transformOrigin = '50% 50%';
      element.insertBefore(span, textNode);
      span.appendChild(textNode);
      results.push(span);
    }
    return results;
  }

  /**
   * Start a real-time inverse-scale counter on all text children so that they
   * remain visually stationary while the parent element animates via scale.
   *
   * No-op when `data-gravity-animate-text` is present — in that case the caller
   * is responsible for applying its own text animation via `translateY`.
   */
  protected startTextCounterScale(): void {
    if (this.shouldAnimateText()) return;

    this._counterTextNodes = this.getOrWrapTextNodes(this.element);
  }

  /**
   * Build a ComponentPhysicsConfig by merging element data attributes over
   * the supplied defaults. Called inside event handlers so live attribute
   * changes take effect on the very next interaction.
   *
   * Supported attributes (beyond bounce / friction / elasticity):
   *   `data-gravity-mass`     – numeric simulated mass (default: 1)
   *   `data-gravity-material` – one of `rigid | metal | rubber | jelly`
   */
  protected physicsConfig(defaults: ComponentPhysicsConfig): ComponentPhysicsConfig {
    const rawMaterial = this.element.getAttribute('data-gravity-material');
    const material: MaterialHint | undefined =
      rawMaterial && VALID_MATERIALS.has(rawMaterial as MaterialHint)
        ? (rawMaterial as MaterialHint)
        : defaults.material;

    const rawMass = this.element.getAttribute('data-gravity-mass');
    const parsedMass = rawMass !== null ? parseFloat(rawMass) : NaN;
    const mass = !isNaN(parsedMass) && parsedMass > 0 ? parsedMass : defaults.mass;

    return {
      bounce:     this.numAttr('bounce',     defaults.bounce),
      friction:   this.numAttr('friction',   defaults.friction),
      elasticity: this.numAttr('elasticity', defaults.elasticity),
      ...(mass     !== undefined && { mass }),
      ...(material !== undefined && { material }),
    };
  }
}

import type {
  AnimatableProperty,
  AnimatorState,
  ComponentPhysicsConfig,
  TransformState,
} from '../types';
import { materialPresets } from '../config/materials';

/**
 * PhysicsService – Spring-based scalar animator powering all UI components.
 *
 * Uses Hooke's Law with mass:  F = −k·x − b·v  →  a = F/m
 * Each (element, property) pair owns an independent AnimatorState so that
 * multiple properties (e.g. scale + translateX) can animate concurrently.
 * Transform properties are composed into a single `transform` string via a
 * per-element TransformState, preventing animations from clobbering each other.
 *
 * Material hints add two layers on top of the basic spring:
 *   1. Spring constant modulation (stiffness × mul, damping × mul, mass × mul).
 *   2. Squash-and-stretch: when animating `scale`, the Y-axis stretches and the
 *      X-axis compresses proportionally to the current spring velocity, giving a
 *      convincing soft-body / elastic material feel entirely within CSS transforms.
 */
export class PhysicsService {
  private static _instance: PhysicsService | null = null;

  /** Returns the shared singleton – useful for cross-component coordination. */
  static getInstance(): PhysicsService {
    if (!PhysicsService._instance) PhysicsService._instance = new PhysicsService();
    return PhysicsService._instance;
  }

  private animators = new Map<string, AnimatorState>();
  private transformStates = new WeakMap<HTMLElement, TransformState>();
  private elementIds = new WeakMap<HTMLElement, string>();
  /**
   * Caches the element's natural (pre-squash) borderRadius so it can be
   * restored when the spring settles back to rest.
   */
  private naturalBorderRadii = new WeakMap<HTMLElement, number>();
  private nextId = 0;

  //  Public API

  /**
   * Animate `property` on `el` towards `target` using the supplied physics config.
   * Calling again mid-animation smoothly redirects from the current value.
   * `mass` and `squashFactor` are resolved from the config on every call so that
   * live attribute changes (e.g. slider updates) take effect immediately.
   */
  animate(
    el: HTMLElement,
    property: AnimatableProperty,
    target: number,
    config: ComponentPhysicsConfig,
  ): void {
    const key = this.key(el, property);
    const spring = this.resolveSpring(config);
    let a = this.animators.get(key);

    if (!a) {
      a = {
        current: this.readCurrentValue(el, property),
        velocity: 0,
        target,
        stiffness: spring.stiffness,
        damping: spring.damping,
        mass: spring.mass,
        squashFactor: spring.squashFactor,
        isRunning: false,
        animationId: null,
        lastTime: 0,
        element: el,
        property,
      };
      this.animators.set(key, a);
    } else if (!a.isRunning) {
      // Re-sync from the DOM when restarting a completed/stopped animation.
      // External code (e.g. BannerComponent replay) may have reset the element's
      // style, so the stored current value can be stale.
      a.current = this.readCurrentValue(el, property);
      a.velocity = 0;
    }

    a.stiffness = spring.stiffness;
    a.damping = spring.damping;
    a.mass = spring.mass;
    a.squashFactor = spring.squashFactor;
    a.target = target;

    if (!a.isRunning || a.animationId === null) {
      a.isRunning = true;
      a.lastTime = 0;
      a.animationId = requestAnimationFrame((t) => this.tick(t, a!));
    }
  }

  /** Stop animation(s) for an element. Omit `property` to stop all. */
  stop(el: HTMLElement, property?: AnimatableProperty): void {
    if (property) {
      this.cancelAnimator(this.animators.get(this.key(el, property)));
    } else {
      const id = this.elementIds.get(el);
      if (!id) return;
      this.animators.forEach((a, k) => {
        if (k.startsWith(`${id}_`)) this.cancelAnimator(a);
      });
    }
  }

  //  Private helpers

  private cancelAnimator(a: AnimatorState | undefined): void {
    if (!a) return;
    if (a.animationId !== null) {
      cancelAnimationFrame(a.animationId);
      a.animationId = null;
    }
    a.isRunning = false;
  }

  private key(el: HTMLElement, property: string): string {
    return `${this.id(el)}_${property}`;
  }

  private id(el: HTMLElement): string {
    if (!this.elementIds.has(el)) this.elementIds.set(el, String(this.nextId++));
    return this.elementIds.get(el)!;
  }

  private readCurrentValue(el: HTMLElement, property: AnimatableProperty): number {
    const ts = this.transformStates.get(el);
    const tfm = el.style.transform;

    // For transform properties, parse the live style string first so that
    // external style resets (e.g. BannerComponent replay) are picked up.
    switch (property) {
      case 'scale': {
        const m = tfm.match(/scale\((-?[\d.]+)\)/);
        if (m) return parseFloat(m[1]);
        if (ts?.scale !== undefined) return ts.scale;
        // Squash mode may have left scaleX/scaleY equal at settle
        return ts?.scaleX ?? 1;
      }
      case 'scaleX': {
        const m = tfm.match(/scaleX\((-?[\d.]+)\)/);
        return m ? parseFloat(m[1]) : (ts?.scaleX ?? 1);
      }
      case 'scaleY': {
        const m = tfm.match(/scaleY\((-?[\d.]+)\)/);
        return m ? parseFloat(m[1]) : (ts?.scaleY ?? 1);
      }
      case 'translateX': {
        const m = tfm.match(/translateX\((-?[\d.]+(?:\.\d+)?)px\)/);
        return m ? parseFloat(m[1]) : (ts?.translateX ?? 0);
      }
      case 'translateY': {
        const m = tfm.match(/translateY\((-?[\d.]+(?:\.\d+)?)px\)/);
        return m ? parseFloat(m[1]) : (ts?.translateY ?? 0);
      }
      case 'rotate': {
        const m = tfm.match(/rotate\((-?[\d.]+)deg\)/);
        return m ? parseFloat(m[1]) : (ts?.rotate ?? 0);
      }
      case 'shadow': {
        const m = el.style.boxShadow.match(/(\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px/);
        return m ? parseFloat(m[1]) : 0;
      }
      case 'blur': {
        const m = el.style.filter.match(/blur\((-?[\d.]+)px\)/);
        return m ? parseFloat(m[1]) : 0;
      }
      case 'borderRadius': {
        const inlineRadius = parseFloat(el.style.borderRadius);
        if (!isNaN(inlineRadius)) return inlineRadius;
        return parseFloat(getComputedStyle(el).borderRadius) || 0;
      }
      case 'maxHeight':
        return parseFloat(el.style.maxHeight) || 0;
      case 'width':
        return parseFloat(el.style.width) || 0;
      case 'opacity':
        return parseFloat(el.style.opacity) || 0;
    }
  }

  private applyValue(a: AnimatorState): void {
    const { element: el, property: prop, current: val } = a;

    if (
      prop === 'scale' || prop === 'scaleX' || prop === 'scaleY' ||
      prop === 'translateX' || prop === 'translateY' || prop === 'rotate'
    ) {
      const ts: TransformState = this.transformStates.get(el) ?? {};

      if (prop === 'scale') {
        // Check if deformation mode is active (scaleX/scaleY already set for position-dependent deformation)
        const isInDeformationMode = ts.scaleX !== undefined || ts.scaleY !== undefined;

        if (!isInDeformationMode && a.squashFactor > 0) {
          // Squash-and-stretch: couple scaleX/scaleY to current spring velocity.
          // scaleY stretches in the direction of motion; scaleX compresses.
          // Volume is approximately conserved: scaleX × scaleY ≈ val².
          const s = Math.max(-0.35, Math.min(0.35, a.velocity * a.squashFactor * 0.05));
          ts.scaleX = val * (1 - s);
          ts.scaleY = val * (1 + s);
          delete ts.scale;

          // BorderRadius softening: store natural radius on first squash encounter,
          // then inflate it proportionally to |s| so corners visibly soften at peak
          // deformation and snap back as the element returns to rest.
          if (!this.naturalBorderRadii.has(el)) {
            const natural = parseFloat(getComputedStyle(el).borderRadius) || 0;
            this.naturalBorderRadii.set(el, natural);
          }
          const natural = this.naturalBorderRadii.get(el)!;
          const extraPx = Math.abs(s) * (natural * 2 + 8); // soften corners by up to 8px + 2× natural
          el.style.borderRadius = `${(natural + extraPx).toFixed(2)}px`;
        } else if (!isInDeformationMode) {
          // Uniform scale: clear any leftover squash-and-stretch state.
          ts.scale = val;
          delete ts.scaleX;
          delete ts.scaleY;
          // Restore natural borderRadius if we previously softened it.
          const natural = this.naturalBorderRadii.get(el);
          if (natural !== undefined) el.style.borderRadius = `${natural.toFixed(2)}px`;
        } else {
          // Deformation mode: when switching from scaleX/scaleY back to uniform scale,
          // compute an average that preserves the perceived size.
          const sx = ts.scaleX ?? 1;
          const sy = ts.scaleY ?? 1;
          ts.scale = Math.sqrt(sx * sy);
          delete ts.scaleX;
          delete ts.scaleY;
        }
      } else if (prop === 'scaleX') {
        // When animating scaleX, clear the uniform scale to avoid conflicts
        delete ts.scale;
        ts.scaleX = val;
      } else if (prop === 'scaleY') {
        // When animating scaleY, clear the uniform scale to avoid conflicts
        delete ts.scale;
        ts.scaleY = val;
      } else if (prop === 'translateX') {
        ts.translateX = val;
      } else if (prop === 'translateY') {
        ts.translateY = val;
      } else if (prop === 'rotate') {
        ts.rotate = val;
      }

      this.transformStates.set(el, ts);
      el.style.transform = this.buildTransform(ts);

      // Synchronously counter-scale text-wrap spans so that text stays visually
      // stationary while the parent element animates.  This must run in the same
      // call stack as the transform write — MutationObserver fires after paint and
      // is one frame too late.  Only active for scale-driving properties.
      if (prop === 'scale' || prop === 'scaleX' || prop === 'scaleY') {
        const textWrappers = el.querySelectorAll<HTMLElement>('[data-gravity-text-wrap]');
        if (textWrappers.length > 0) {
          // Use scaleX/scaleY when available, fall back to uniform scale
          const sx = ts.scaleX !== undefined ? ts.scaleX : (ts.scale ?? 1);
          const sy = ts.scaleY !== undefined ? ts.scaleY : (ts.scale ?? 1);
          const ix = sx > 0 ? 1 / sx : 1;
          const iy = sy > 0 ? 1 / sy : 1;
          const counterTransform = (Math.abs(ix - 1) < 1e-4 && Math.abs(iy - 1) < 1e-4)
            ? ''
            : `scaleX(${ix.toFixed(4)}) scaleY(${iy.toFixed(4)})`;
          textWrappers.forEach(w => { w.style.transform = counterTransform; });
        }
      }
    } else if (prop === 'shadow') {
      el.style.boxShadow = `0 ${val.toFixed(1)}px ${(val * 1.5).toFixed(1)}px rgba(0,0,0,0.3)`;
    } else if (prop === 'blur') {
      el.style.filter = val > 0.01 ? `blur(${val.toFixed(2)}px)` : '';
    } else if (prop === 'borderRadius') {
      el.style.borderRadius = `${val.toFixed(2)}px`;
    } else if (prop === 'maxHeight') {
      el.style.maxHeight = `${val.toFixed(2)}px`;
    } else if (prop === 'width') {
      el.style.width = `${val.toFixed(2)}%`;
    } else if (prop === 'opacity') {
      el.style.opacity = Math.min(1, Math.max(0, val)).toFixed(3);
    }
  }

  /**
   * Compose a CSS `transform` string from the stored per-element TransformState.
   *
   * Order: translate → rotate → scale.  When scaleX/scaleY are present (set by
   * squash-and-stretch or explicit per-axis animation) they take precedence over
   * the uniform `scale` value to avoid compounding conflicts.
   */
  private buildTransform(ts: TransformState): string {
    const parts: string[] = [];
    if (ts.translateX !== undefined) parts.push(`translateX(${ts.translateX.toFixed(3)}px)`);
    if (ts.translateY !== undefined) parts.push(`translateY(${ts.translateY.toFixed(3)}px)`);
    if (ts.rotate !== undefined) parts.push(`rotate(${ts.rotate.toFixed(3)}deg)`);
    if (ts.scaleX !== undefined || ts.scaleY !== undefined) {
      // Per-axis scale (squash mode or independent scaleX/scaleY animation).
      // Fall back to the uniform scale value when one axis is missing.
      const sx = ts.scaleX ?? ts.scale ?? 1;
      const sy = ts.scaleY ?? ts.scale ?? 1;
      parts.push(`scaleX(${sx.toFixed(4)}) scaleY(${sy.toFixed(4)})`);
    } else if (ts.scale !== undefined) {
      parts.push(`scale(${ts.scale.toFixed(4)})`);
    }
    return parts.join(' ');
  }

  private tick(currentTime: number, a: AnimatorState): void {
    if (!a.isRunning) return;
    if (a.lastTime === 0) a.lastTime = currentTime;

    const dt = Math.min((currentTime - a.lastTime) / 1000, 0.05);
    a.lastTime = currentTime;

    const displacement = a.current - a.target;
    // Newtonian integration: F = −k·x − b·v,  a = F/m
    a.velocity += ((-a.stiffness * displacement - a.damping * a.velocity) / a.mass) * dt;
    a.current += a.velocity * dt;

    // Settle check – snap to target when virtually at rest
    if (Math.abs(displacement) < 5e-4 && Math.abs(a.velocity) < 5e-4) {
      a.current = a.target;
      a.velocity = 0;
      a.isRunning = false;
      a.animationId = null;
      this.applyValue(a);
      this.applyMotionBlur(a); // velocity is 0 here → clears filter
      return;
    }

    this.applyValue(a);
    this.applyMotionBlur(a);
    a.animationId = requestAnimationFrame((t) => this.tick(t, a));
  }

  /**
   * Optionally drive a CSS `blur()` filter proportional to the animator's
   * current |velocity|.  Only active on elements with `data-gravity-motion-blur`.
   *
   * Attribute value:
   *   - Omitted / empty → default coefficient of 0.06 px per unit velocity
   *   - Numeric string  → custom coefficient (e.g. `data-gravity-motion-blur="0.1"`)
   *
   * Only fires for scale / translate / rotate animators; ignored for properties
   * that don't drive visible motion (opacity, maxHeight, etc.).
   *
   * NOTE: avoid combining with an explicit `blur` AnimatableProperty animation
   * on the same element – they both write to `style.filter`.
   */
  private applyMotionBlur(a: AnimatorState): void {
    const { element: el, property: prop } = a;
    // Motion blur only makes sense on transform-driving properties.
    if (
      prop !== 'scale' && prop !== 'scaleX' && prop !== 'scaleY' &&
      prop !== 'translateX' && prop !== 'translateY' && prop !== 'rotate'
    ) return;

    const attr = el.getAttribute('data-gravity-motion-blur');
    if (attr === null) return; // opt-in required

    const coeff = attr === '' ? 0.06 : Math.max(0, parseFloat(attr) || 0.06);
    const blurPx = Math.min(8, Math.abs(a.velocity) * coeff);

    el.style.filter = blurPx >= 0.1 ? `blur(${blurPx.toFixed(2)}px)` : '';
  }

  /**
   * Map user-facing bounce / friction / elasticity / mass / material knobs to
   * internal spring constants, effective mass, and squash-and-stretch factor.
   *
   * Material presets are applied as multipliers on top of the scalar values, so
   * all user knobs remain fully respected – the material just biases the result.
   */
  private resolveSpring(c: ComponentPhysicsConfig): {
    stiffness: number;
    damping: number;
    mass: number;
    squashFactor: number;
  } {
    const preset = c.material ? materialPresets[c.material].spring : null;

    const baseStiffness = 80 + c.bounce * 200;
    const baseDamping = (5 + c.friction * 20) * (1.8 - c.elasticity * 0.8);
    const baseMass = Math.max(0.1, c.mass ?? 1);

    return {
      stiffness: baseStiffness * (preset?.stiffnessMul ?? 1),
      damping: baseDamping * (preset?.dampingMul ?? 1),
      mass: baseMass * (preset?.massMul ?? 1),
      squashFactor: preset?.squashFactor ?? 0,
    };
  }
}
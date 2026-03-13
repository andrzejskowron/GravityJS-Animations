/**
 * GravityJS – Physics-based UI animation library.
 *
 * Provides two systems:
 *  1. GravityEngine  – falling / bouncing DOM elements (Newtonian physics).
 *  2. initComponents – spring-animated UI components driven by data-gravity-* attributes.
 */

//  Core physics engine
import { Vector2 } from './core/Vector2';
import { PhysicsBody } from './core/PhysicsBody';
import { GravityEngine } from './core/GravityEngine';
import { PhysicsService } from './core/PhysicsService';
import {
  ContourDeformationProfile,
  computeDeformation,
  DeformationMode,
  DeformationOptions,
  DeformationResult,
  EDGE_THRESHOLD,
  EDGE_AMP,
  CORNER_BOOST,
  EDGE_BIAS,
  DEFAULT_DEPTH,
} from './core/deformation';

export { Vector2 } from './core/Vector2';
export { PhysicsBody, UpdateFrequency, FrequencyConfigurations } from './core/PhysicsBody';
export type { PhysicsBodyOptions } from './core/PhysicsBody';
export { GravityEngine } from './core/GravityEngine';
export type { GravityEngineOptions, ElementConfig } from './core/GravityEngine';
export { PhysicsService } from './core/PhysicsService';

//  Deformation module exports
export { computeDeformation };
export type { ContourDeformationProfile, DeformationMode, DeformationOptions, DeformationResult };
export { EDGE_THRESHOLD, EDGE_AMP, CORNER_BOOST, EDGE_BIAS, DEFAULT_DEPTH };

//  Shared types
export type {
  AnimatableProperty,
  MaterialHint,
  ComponentPhysicsConfig,
  SpringConfig,
  TransformState,
  AnimatorState,
} from './types';

//  Material presets
export { materialPresets } from './config/materials';
export type { MaterialConfig, SpringMaterialConfig, BodyMaterialConfig, PlateMaterialConfig } from './config/materials';

//  Components
export { BaseComponent } from './components/BaseComponent';
export { ButtonComponent } from './components/ButtonComponent';
export { AccordionComponent } from './components/AccordionComponent';
export { BannerComponent } from './components/BannerComponent';
export { MenuComponent } from './components/MenuComponent';
export { CardComponent } from './components/CardComponent';
export { InputComponent } from './components/InputComponent';
export { AlertComponent } from './components/AlertComponent';
export { BadgeComponent } from './components/BadgeComponent';
export { ProgressComponent } from './components/ProgressComponent';
export { TiltComponent } from './components/TiltComponent';
export { ScrollAnimationComponent } from './components/ScrollAnimationComponent';
export { NavigationComponent } from './components/NavigationComponent';

import { UpdateFrequency, FrequencyConfigurations } from './core/PhysicsBody';
import { materialPresets } from './config/materials';
import { ButtonComponent } from './components/ButtonComponent';
import { AccordionComponent } from './components/AccordionComponent';
import { BannerComponent } from './components/BannerComponent';
import { MenuComponent } from './components/MenuComponent';
import { CardComponent } from './components/CardComponent';
import { InputComponent } from './components/InputComponent';
import { AlertComponent } from './components/AlertComponent';
import { BadgeComponent } from './components/BadgeComponent';
import { ProgressComponent } from './components/ProgressComponent';
import { TiltComponent } from './components/TiltComponent';
import { ScrollAnimationComponent } from './components/ScrollAnimationComponent';
import { NavigationComponent } from './components/NavigationComponent';
import type { BaseComponent } from './components/BaseComponent';

//  Component registry

/** Map of data-gravity-* attribute → component constructor. */
const COMPONENT_REGISTRY = [
  ButtonComponent,
  AccordionComponent,
  BannerComponent,
  MenuComponent,
  CardComponent,
  InputComponent,
  AlertComponent,
  BadgeComponent,
  ProgressComponent,
  TiltComponent,
  ScrollAnimationComponent,
  NavigationComponent,
] as const;

/** All attribute selectors joined, used by the MutationObserver. */
const ALL_SELECTORS = COMPONENT_REGISTRY.map((C) => C.selector).join(', ');

/** Weak-map keeps component instances alongside their elements (no DOM pollution). */
const instanceMap = new WeakMap<HTMLElement, BaseComponent[]>();

/** Attach all matching components to a single element. */
function attachToElement(el: HTMLElement): void {
  const instances: BaseComponent[] = [];
  for (const Comp of COMPONENT_REGISTRY) {
    if (el.matches(Comp.selector)) {
      const comp = new Comp(el);
      comp.attach();
      instances.push(comp);
    }
  }
  if (instances.length) instanceMap.set(el, instances);
}

/** Destroy all component instances attached to an element. */
function destroyElement(el: HTMLElement): void {
  instanceMap.get(el)?.forEach((c) => c.destroy());
  instanceMap.delete(el);
}

let observer: MutationObserver | null = null;

/**
 * Scan the DOM for all `data-gravity-*` component attributes and initialise
 * the appropriate component classes. A MutationObserver is installed to
 * handle elements added or removed later (React, Vue, Angular, etc.).
 *
 * @param root - Subtree root to scan (defaults to `document.body`).
 * @returns A teardown function that destroys all components and disconnects
 *          the observer.
 */
export function initComponents(root: HTMLElement = document.body): () => void {
  // Bootstrap existing elements
  root.querySelectorAll<HTMLElement>(ALL_SELECTORS).forEach(attachToElement);

  // Watch for future additions / removals
  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.matches?.(ALL_SELECTORS)) attachToElement(node);
        node.querySelectorAll<HTMLElement>(ALL_SELECTORS).forEach(attachToElement);
      });
      mutation.removedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        destroyElement(node);
        node.querySelectorAll<HTMLElement>(ALL_SELECTORS).forEach(destroyElement);
      });
    }
  });

  observer.observe(root, { childList: true, subtree: true });

  return () => {
    observer?.disconnect();
    observer = null;
    root.querySelectorAll<HTMLElement>(ALL_SELECTORS).forEach(destroyElement);
  };
}

/**
 * Initialise the GravityEngine on all `[data-gravity]` elements.
 */
export function initGravity(options?: {
  selector?: string;
  gravity?: { x: number; y: number };
  airDrag?: number;
  timeScale?: number;
}): GravityEngine {
  const selector = options?.selector ?? '[data-gravity]';
  const engine = new GravityEngine({
    gravity: options?.gravity
      ? new Vector2(options.gravity.x, options.gravity.y)
      : undefined,
    airDrag: options?.airDrag,
    timeScale: options?.timeScale,
  });
  engine.addFromSelector(selector);
  return engine;
}

//  UMD / global export
const GravityJS = {
  // Core
  Vector2,
  PhysicsBody,
  UpdateFrequency,
  FrequencyConfigurations,
  GravityEngine,
  PhysicsService,
  // Config
  materialPresets,
  // Deformation exports (for programmatic use)
  computeDeformation,
  EDGE_THRESHOLD,
  EDGE_AMP,
  CORNER_BOOST,
  EDGE_BIAS,
  DEFAULT_DEPTH,
  // Components
  ButtonComponent,
  AccordionComponent,
  BannerComponent,
  MenuComponent,
  CardComponent,
  InputComponent,
  AlertComponent,
  BadgeComponent,
  ProgressComponent,
  TiltComponent,
  ScrollAnimationComponent,
  NavigationComponent,
  // Init helpers
  initGravity,
  initComponents,
 };

export default GravityJS;

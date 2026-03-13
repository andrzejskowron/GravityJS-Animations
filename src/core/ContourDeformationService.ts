import { materialPresets, type PlateMaterialConfig } from '../config/materials';
import type { ComponentPhysicsConfig } from '../types';
import type { ContourDeformationProfile, DeformationMode } from './deformation';

interface BoundarySample {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

interface ContourState {
  element: HTMLElement;
  samples: BoundarySample[];
  modes: PlateMode[];
  current: number[];
  velocity: number[];
  target: number[];
  width: number;
  height: number;
  radius: number;
  plate: PlateMaterialConfig;
  surfaceZ: number;
  stiffness: number;
  damping: number;
  mass: number;
  isRunning: boolean;
  animationId: number | null;
  lastTime: number;
  clipPath: string;
  webkitClipPath: string;
}

interface PlateMode {
  lambdaX: number;
  lambdaY: number;
  lambda2: number;
}

const EDGE_SAMPLES = 8;
const CORNER_SAMPLES = 7;
const MODAL_ORDER_X = 4;
const MODAL_ORDER_Y = 4;

export class ContourDeformationService {
  private static _instance: ContourDeformationService | null = null;

  static getInstance(): ContourDeformationService {
    if (!ContourDeformationService._instance) {
      ContourDeformationService._instance = new ContourDeformationService();
    }
    return ContourDeformationService._instance;
  }

  private readonly states = new WeakMap<HTMLElement, ContourState>();

  deform(
    el: HTMLElement,
    baseRadius: number,
    contour: ContourDeformationProfile,
    mode: DeformationMode,
    cfg: ComponentPhysicsConfig,
  ): void {
    const state = this.ensureState(el, baseRadius, cfg);
    state.target = this.solvePlateTargets(state, contour, mode);
    this.start(state);
  }

  reset(el: HTMLElement, baseRadius: number, cfg: ComponentPhysicsConfig): void {
    const state = this.ensureState(el, baseRadius, cfg);
    state.target = state.target.map(() => 0);
    this.start(state);
  }

  destroy(el: HTMLElement): void {
    const state = this.states.get(el);
    if (!state) return;

    if (state.animationId !== null) {
      cancelAnimationFrame(state.animationId);
    }

    state.isRunning = false;
    state.animationId = null;
    this.restoreClipPath(state);
    this.states.delete(el);
  }

  private ensureState(
    el: HTMLElement,
    baseRadius: number,
    cfg: ComponentPhysicsConfig,
  ): ContourState {
    const size = this.measure(el);
    const radius = clamp(baseRadius, 0, Math.min(size.width, size.height) / 2);
    const plate = this.resolvePlate(cfg);
    let state = this.states.get(el);

    if (!state) {
      const samples = buildRoundedRectSamples(size.width, size.height, radius);
      const modes = buildPlateModes(size.width * plate.metersPerPixel, size.height * plate.metersPerPixel);
      state = {
        element: el,
        samples,
        modes,
        current: modes.map(() => 0),
        velocity: modes.map(() => 0),
        target: modes.map(() => 0),
        width: size.width,
        height: size.height,
        radius,
        plate,
        surfaceZ: -plate.thickness * 0.5,
        stiffness: 0,
        damping: 0,
        mass: 1,
        isRunning: false,
        animationId: null,
        lastTime: 0,
        clipPath: el.style.clipPath,
        webkitClipPath: (el.style as CSSStyleDeclaration & { webkitClipPath?: string }).webkitClipPath ?? '',
      };
      this.states.set(el, state);
    }

    if (
      Math.abs(state.width - size.width) > 0.5
      || Math.abs(state.height - size.height) > 0.5
      || Math.abs(state.radius - radius) > 0.5
    ) {
      const previousCurrent = state.current;
      const previousVelocity = state.velocity;
      const previousTarget = state.target;

      state.width = size.width;
      state.height = size.height;
      state.radius = radius;
      state.samples = buildRoundedRectSamples(size.width, size.height, radius);
      state.modes = buildPlateModes(size.width * plate.metersPerPixel, size.height * plate.metersPerPixel);
      state.current = state.modes.map((_, i) => previousCurrent[i] ?? 0);
      state.velocity = state.modes.map((_, i) => previousVelocity[i] ?? 0);
      state.target = state.modes.map((_, i) => previousTarget[i] ?? 0);
    }

    const spring = this.resolveResponse(cfg, plate);
    state.plate = plate;
    state.surfaceZ = -plate.thickness * 0.5;
    state.stiffness = spring.stiffness * 0.85;
    state.damping = spring.damping * 1.06;
    state.mass = spring.mass;
    return state;
  }

  private start(state: ContourState): void {
    if (state.isRunning && state.animationId !== null) {
      return;
    }

    state.isRunning = true;
    state.lastTime = 0;
    state.animationId = requestAnimationFrame((time) => this.tick(time, state));
  }

  private tick(currentTime: number, state: ContourState): void {
    if (!state.isRunning) return;
    if (state.lastTime === 0) state.lastTime = currentTime;

    const dt = Math.min((currentTime - state.lastTime) / 1000, 0.05);
    state.lastTime = currentTime;

    const nextCurrent = [...state.current];
    const nextVelocity = [...state.velocity];
    let maxDisplacement = 0;
    let maxVelocity = 0;

    for (let i = 0; i < state.modes.length; i++) {
      const displacement = state.current[i] - state.target[i];
      const force = -state.stiffness * displacement - state.damping * state.velocity[i];

      nextVelocity[i] += (force / state.mass) * dt;
      nextCurrent[i] += nextVelocity[i] * dt;
      maxDisplacement = Math.max(maxDisplacement, Math.abs(displacement));
      maxVelocity = Math.max(maxVelocity, Math.abs(nextVelocity[i]));
    }

    state.current = nextCurrent;
    state.velocity = nextVelocity;

    if (maxDisplacement < 0.04 && maxVelocity < 0.04) {
      state.current = [...state.target];
      state.velocity = state.velocity.map(() => 0);
      state.isRunning = false;
      state.animationId = null;

      if (state.target.every((value) => Math.abs(value) < 0.01)) {
        this.restoreClipPath(state);
      } else {
        this.applyShape(state);
      }
      return;
    }

    this.applyShape(state);
    state.animationId = requestAnimationFrame((time) => this.tick(time, state));
  }

  private applyShape(state: ContourState): void {
    const limitX = state.width * 0.12;
    const limitY = state.height * 0.12;
    const polygon = `polygon(${state.samples.map((sample, index) => {
      const displacement = this.evaluateBoundaryDisplacement(state, sample);
      const displacedX = clamp(sample.x + displacement.x, -limitX, state.width + limitX);
      const displacedY = clamp(sample.y + displacement.y, -limitY, state.height + limitY);
      return `${displacedX.toFixed(2)}px ${displacedY.toFixed(2)}px`;
    }).join(', ')})`;

    state.element.style.clipPath = polygon;
    (state.element.style as CSSStyleDeclaration & { webkitClipPath?: string }).webkitClipPath = polygon;
  }

  private restoreClipPath(state: ContourState): void {
    state.element.style.clipPath = state.clipPath;
    (state.element.style as CSSStyleDeclaration & { webkitClipPath?: string }).webkitClipPath = state.webkitClipPath;
  }

  private measure(el: HTMLElement): { width: number; height: number } {
    const rect = el.getBoundingClientRect();
    return {
      width: Math.max(1, el.offsetWidth || el.clientWidth || rect.width || 1),
      height: Math.max(1, el.offsetHeight || el.clientHeight || rect.height || 1),
    };
  }

  private solvePlateTargets(
    state: ContourState,
    contour: ContourDeformationProfile,
    mode: DeformationMode,
  ): number[] {
    if (contour.force <= 0) {
      return state.target.map(() => 0);
    }

    const metersPerPixel = state.plate.metersPerPixel;
    const widthMeters = state.width * metersPerPixel;
    const heightMeters = state.height * metersPerPixel;
    const x = clamp(contour.contactX, 0.02, 0.98) * widthMeters;
    const y = clamp(contour.contactY, 0.02, 0.98) * heightMeters;
    const sigma = Math.max(0.0025, contour.contactRadius * metersPerPixel * 0.55);
    const signedForce = (mode === 'spread' ? -1 : 1) * contour.force;
    const modalLoadScale = (4 * signedForce) / (widthMeters * heightMeters);
    const rigidity = flexuralRigidity(state.plate);
    const modalCap = Math.min(widthMeters, heightMeters) * 0.25;

    return state.modes.map((plateMode) => {
      const shapeAtContact = Math.sin(plateMode.lambdaX * x) * Math.sin(plateMode.lambdaY * y);
      const gaussianAttenuation = Math.exp(-0.5 * sigma * sigma * plateMode.lambda2);
      const modalLoad = modalLoadScale * shapeAtContact * gaussianAttenuation;
      const amplitude = modalLoad / (rigidity * plateMode.lambda2 * plateMode.lambda2);
      return clamp(amplitude, -modalCap, modalCap);
    });
  }

  private evaluateBoundaryDisplacement(
    state: ContourState,
    sample: BoundarySample,
  ): { x: number; y: number } {
    const metersPerPixel = state.plate.metersPerPixel;
    const x = sample.x * metersPerPixel;
    const y = sample.y * metersPerPixel;
    let dwDx = 0;
    let dwDy = 0;

    for (let i = 0; i < state.modes.length; i++) {
      const plateMode = state.modes[i];
      const amplitude = state.current[i];
      const sinX = Math.sin(plateMode.lambdaX * x);
      const sinY = Math.sin(plateMode.lambdaY * y);
      dwDx += amplitude * plateMode.lambdaX * Math.cos(plateMode.lambdaX * x) * sinY;
      dwDy += amplitude * plateMode.lambdaY * sinX * Math.cos(plateMode.lambdaY * y);
    }

    const offsetX = clamp(((-state.surfaceZ * dwDx) / metersPerPixel), -state.width * 0.12, state.width * 0.12);
    const offsetY = clamp(((-state.surfaceZ * dwDy) / metersPerPixel), -state.height * 0.12, state.height * 0.12);
    return { x: offsetX, y: offsetY };
  }

  private resolvePlate(c: ComponentPhysicsConfig): PlateMaterialConfig {
    return (c.material ? materialPresets[c.material] : materialPresets.rubber).plate;
  }

  private resolveResponse(
    c: ComponentPhysicsConfig,
    plate: PlateMaterialConfig,
  ): { stiffness: number; damping: number; mass: number } {
    const preset = c.material ? materialPresets[c.material].spring : materialPresets.rubber.spring;
    const baseStiffness = 80 + c.bounce * 200;
    const baseDamping = (5 + c.friction * 20) * (1.8 - c.elasticity * 0.8);
    const densityMul = Math.max(0.65, Math.sqrt(plate.density / 1100));
    const baseMass = Math.max(0.1, c.mass ?? 1) * densityMul;

    return {
      stiffness: baseStiffness * (preset?.stiffnessMul ?? 1),
      damping: baseDamping * (preset?.dampingMul ?? 1),
      mass: baseMass * (preset?.massMul ?? 1),
    };
  }
}

function buildPlateModes(widthMeters: number, heightMeters: number): PlateMode[] {
  const width = Math.max(widthMeters, 1e-4);
  const height = Math.max(heightMeters, 1e-4);
  const modes: PlateMode[] = [];

  for (let m = 1; m <= MODAL_ORDER_X; m++) {
    for (let n = 1; n <= MODAL_ORDER_Y; n++) {
      const lambdaX = (m * Math.PI) / width;
      const lambdaY = (n * Math.PI) / height;
      modes.push({
        lambdaX,
        lambdaY,
        lambda2: lambdaX * lambdaX + lambdaY * lambdaY,
      });
    }
  }

  return modes;
}

function flexuralRigidity(plate: PlateMaterialConfig): number {
  return (plate.youngModulus * Math.pow(plate.thickness, 3))
    / (12 * (1 - plate.poissonRatio * plate.poissonRatio));
}

function buildRoundedRectSamples(width: number, height: number, radius: number): BoundarySample[] {
  const r = clamp(radius, 0, Math.min(width, height) / 2);
  const samples: BoundarySample[] = [];

  const push = (x: number, y: number, nx: number, ny: number): void => {
    const previous = samples[samples.length - 1];
    if (previous && Math.abs(previous.x - x) < 0.01 && Math.abs(previous.y - y) < 0.01) return;
    samples.push({ x, y, nx, ny });
  };

  const addStraight = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    nx: number,
    ny: number,
    count: number,
    includeStart: boolean,
  ): void => {
    const start = includeStart ? 0 : 1;
    for (let i = start; i <= count; i++) {
      const t = i / count;
      push(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, nx, ny);
    }
  };

  const addArc = (
    cx: number,
    cy: number,
    startAngle: number,
    endAngle: number,
    count: number,
  ): void => {
    for (let i = 1; i <= count; i++) {
      const t = i / count;
      const angle = startAngle + (endAngle - startAngle) * t;
      push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, Math.cos(angle), Math.sin(angle));
    }
  };

  if (r <= 0.01) {
    addStraight(0, 0, width, 0, 0, -1, EDGE_SAMPLES, true);
    addStraight(width, 0, width, height, 1, 0, EDGE_SAMPLES, false);
    addStraight(width, height, 0, height, 0, 1, EDGE_SAMPLES, false);
    addStraight(0, height, 0, 0, -1, 0, EDGE_SAMPLES, false);
    return samples;
  }

  addStraight(r, 0, width - r, 0, 0, -1, EDGE_SAMPLES, true);
  addArc(width - r, r, -Math.PI / 2, 0, CORNER_SAMPLES);
  addStraight(width, r, width, height - r, 1, 0, EDGE_SAMPLES, false);
  addArc(width - r, height - r, 0, Math.PI / 2, CORNER_SAMPLES);
  addStraight(width - r, height, r, height, 0, 1, EDGE_SAMPLES, false);
  addArc(r, height - r, Math.PI / 2, Math.PI, CORNER_SAMPLES);
  addStraight(0, height - r, 0, r, -1, 0, EDGE_SAMPLES, false);
  addArc(r, r, Math.PI, Math.PI * 1.5, CORNER_SAMPLES);

  return samples;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
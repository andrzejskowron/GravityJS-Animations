import { Vector2 } from './Vector2';
import { PhysicsBody, UpdateFrequency, FrequencyConfigurations } from './PhysicsBody';

export interface CPUMetrics {
  load: number; // 0-1, where 1 is maximum load
  frameTime: number; // Current frame time in ms
  fps: number;
}

export interface AdaptiveTimeConfig {
  enabled: boolean;
  targetFPS: number;
  maxFrameTime: number; // Maximum acceptable frame time (default 50ms)
  minFrameTime: number; // Minimum frame time (default 16ms for 60fps)
  loadThresholds: {
    low: number; // Below this = optimal performance
    high: number; // Above this = reduced physics calculations
    critical: number; // Above this = minimal physics updates
  };
  timeScaleCurve: (load: number) => number; // Function to calculate time scale based on load
}

export interface GravityEngineOptions {
  gravity?: Vector2;
  airDrag?: number;
  timeScale?: number;
  autoStart?: boolean;
  adaptiveTime?: AdaptiveTimeConfig;
}

export interface ElementConfig {
  element: HTMLElement;
  mass?: number;
  elasticity?: number;
  friction?: number;
  airDrag?: number;
  useSpring?: boolean;
  springStiffness?: number;
  springDamping?: number;
  springTarget?: { x: number; y: number };
  fixedPosition?: boolean;
  /** Assigned update frequency category */
  updateFrequency?: UpdateFrequency;
}

/**
 * GravityEngine - Main physics engine class.
 * Manages all physics bodies and runs the animation loop with batched updates.
 */
export class GravityEngine {
  gravity: Vector2;
  airDrag: number;
  timeScale: number;

  private bodies: PhysicsBody[] = [];

  // Batch update frequency grouping
  private bodyFrequencyGroups: Map<UpdateFrequency, PhysicsBody[]> = new Map();

  // Animation loop properties
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private resizeHandler: () => void;

  // Frame counter for batch updates
  private frameCount: number = 0;

  // Adaptive Time Scaling Properties
  private adaptiveConfig: AdaptiveTimeConfig;
  private cpuMetrics: CPUMetrics = { load: 0, frameTime: 0, fps: 60 };
  private performanceHistory: number[] = [];
  private historyWindowSize: number = 10;
  private lastPerformanceCheck: number = 0;
  private readonly PERFORMANCE_CHECK_INTERVAL: number = 500; // Check every 500ms

  constructor(options: GravityEngineOptions = {}) {
    // Realistic gravity for pixel-based physics (approximates Earth's 9.8 m/s² at typical screen scales)
    // At ~386 px/meter scale: 9.8 * 386 ≈ 3784 px/s², but we use slightly higher for responsive web feel
    this.gravity = options.gravity ?? new Vector2(0, 3800);
    this.airDrag = options.airDrag ?? 0.01;
    this.timeScale = options.timeScale ?? 1;
    this.adaptiveConfig = options.adaptiveTime ?? {
      enabled: true,
      targetFPS: 60,
      maxFrameTime: 50,
      minFrameTime: 16,
      loadThresholds: {
        low: 0.3,
        high: 0.7,
        critical: 0.85
      },
      timeScaleCurve: this.calculateAdaptiveTimeScale.bind(this)
    };

    // Initialize frequency groups
    Object.values(UpdateFrequency).forEach(freq => {
      this.bodyFrequencyGroups.set(freq, []);
    });

    this.resizeHandler = () => this.bodies.forEach((b) => b.updateDimensions());
    if (options.autoStart !== false) this.start();
  }

  /**
   * Categorizes all physics bodies by their update frequency.
   */
  categorizeBodiesByFrequency(): void {
    // Clear existing groups
    Object.values(UpdateFrequency).forEach(freq => {
      this.bodyFrequencyGroups.set(freq, []);
    });

    // Assign each body to its frequency group
    this.bodies.forEach(body => {
      const freq = body.updateFrequency || UpdateFrequency.MEDIUM;
      this.bodyFrequencyGroups.get(freq)?.push(body);
    });

  }

  /**
   * Updates physics bodies in batches based on their frequency groups.
   * High-frequency bodies update every frame, while medium and low-frequency
   * bodies update at reduced rates to optimize performance.
   */
  private updateBodiesByFrequency(deltaTime: number): void {
    this.frameCount++;

    // Update all bodies in each frequency group
    Object.values(UpdateFrequency).forEach(frequency => {
      const groupedBodies = this.bodyFrequencyGroups.get(frequency);
      if (!groupedBodies) return;

      groupedBodies.forEach(body => {
        // Check if body should be updated based on its frequency interval
        if (body.shouldBeUpdated(this.frameCount)) {
          body.update(deltaTime, this.gravity, this.frameCount);
        } else {
          // For non-updated frames: only move bodies that are NOT sleeping
          // Sleeping bodies must remain completely stationary until woken up
          if (!body.fixedPosition && !body.isSleeping) {
            const dt = Math.min(deltaTime, 0.05);

            // Always use current velocity for smooth motion during non-update frames
            body.position = body.position.add(body.velocity.multiply(dt));
            body.updateElementPosition();
          }
          // Sleeping bodies do NOT move on non-update frames - they stay put
        }
      });
    });
  }

  /**
   * Gets all bodies grouped by their frequency category.
   */
  getBodiesByFrequency(frequency: UpdateFrequency): PhysicsBody[] {
    return this.bodyFrequencyGroups.get(frequency) || [];
  }

  /**
   * Gets the complete frequency group map.
   */
  getFrequencyGroups(): Map<UpdateFrequency, PhysicsBody[]> {
    return this.bodyFrequencyGroups;
  }

  /**
   * Calculates adaptive time scale based on CPU load using a smooth curve.
   * Returns a time scale factor that reduces physics calculations during high load.
   */
  private calculateAdaptiveTimeScale(load: number): number {
    if (!this.adaptiveConfig.enabled) return 1;

    const thresholds = this.adaptiveConfig.loadThresholds;

    // Smooth step function for time scale calculation
    let timeScale: number;

    if (load <= thresholds.low) {
      // Optimal performance - full physics calculations
      timeScale = 1.0;
    } else if (load < thresholds.high) {
      // Moderate load - slight reduction in physics updates
      const normalizedLoad = (load - thresholds.low) / (thresholds.high - thresholds.low);
      timeScale = 1.0 - (normalizedLoad * 0.2); // Reduce by up to 20%
    } else if (load < thresholds.critical) {
      // High load - significant reduction in physics calculations
      const normalizedLoad = (load - thresholds.high) / (thresholds.critical - thresholds.high);
      timeScale = 0.8 - (normalizedLoad * 0.3); // Reduce by up to 50%
    } else {
      // Critical load - minimal physics updates with sleep mode support
      const normalizedLoad = Math.min((load - thresholds.critical) / 0.2, 1);
      timeScale = 0.5 - (normalizedLoad * 0.2); // Reduce by up to 70%
    }

    return Math.max(0.3, Math.min(1.0, timeScale)); // Clamp between 0.3 and 1.0
  }

  /**
   * Measures current CPU performance metrics using Performance API and frame timing.
   */
  private measureCPUPerformance(currentTime: number): void {
    const frameTime = currentTime - this.lastPerformanceCheck;

    // Collect frame time samples for smoothing
    this.performanceHistory.push(frameTime);
    if (this.performanceHistory.length > this.historyWindowSize) {
      this.performanceHistory.shift();
    }

    // Calculate average frame time and FPS
    const avgFrameTime = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
    const fps = 1000 / avgFrameTime;

    // Estimate CPU load based on frame time variance and absolute performance
    let cpuLoad: number;

    if (typeof performance !== 'undefined' && performance.getEntriesByType('measure').length > 0) {
      // Use Performance API data when available
      const measures = performance.getEntriesByType('measure');
      const lastMeasure = measures[measures.length - 1] as PerformanceMeasure;
      cpuLoad = Math.min(1, (lastMeasure.duration || frameTime) / this.adaptiveConfig.maxFrameTime);
    } else {
      // Fallback to frame time-based load estimation
      cpuLoad = Math.min(1, avgFrameTime / this.adaptiveConfig.maxFrameTime);

      // Adjust for frame time variance (higher variance indicates higher CPU load)
      const variance = this.performanceHistory.reduce((sum, ft) => sum + Math.pow(ft - avgFrameTime, 2), 0)
        / this.performanceHistory.length;
      cpuLoad += Math.min(0.3, Math.sqrt(variance) / 50);
    }

    // Update CPU metrics
    this.cpuMetrics = {
      load: cpuLoad,
      frameTime: avgFrameTime,
      fps: fps
    };

    this.lastPerformanceCheck = currentTime;
  }

  /**
   * Adjusts physics body sleep states based on current CPU load.
   */
  private adjustBodySleepStates(): void {
    const thresholds = this.adaptiveConfig.loadThresholds;

    if (this.cpuMetrics.load >= thresholds.critical) {
      // Enter critical mode - put idle bodies to sleep
      this.bodies.forEach(body => {
        if (body.isAtRest() && !body.isSleeping) {
          body.sleep();
        }
      });
    } else if (this.cpuMetrics.load <= thresholds.low) {
      // Return to optimal mode - wake all bodies
      this.bodies.forEach(body => {
        if (body.isSleeping) {
          body.wake();
        }
      });
    } else if (this.cpuMetrics.load >= thresholds.high) {
      // High load mode - sleep more bodies based on activity level
      this.bodies.forEach(body => {
        if (!body.isAtRest() && body.isSleeping) {
          body.wake();
        }
        if (body.isAtRest() && !body.isSleeping) {
          body.sleep();
        }
      });
    }
  }

  /**
   * Main animation loop - updates all physics bodies with adaptive time scaling and batched frequency-based updates.
   */
  private update = (currentTime: number): void => {
    if (!this.isRunning) return;
    if (this.lastTime === 0) this.lastTime = currentTime;

    // Calculate raw delta time
    const rawDeltaTime = ((currentTime - this.lastTime) / 1000);

    // Measure CPU performance periodically
    if (currentTime - this.lastPerformanceCheck >= this.PERFORMANCE_CHECK_INTERVAL) {
      this.measureCPUPerformance(currentTime);
      this.adjustBodySleepStates();
    }

    // Apply adaptive time scaling based on current CPU load
    const adaptiveScale = this.adaptiveConfig.timeScaleCurve(this.cpuMetrics.load);
    const effectiveDeltaTime = rawDeltaTime * adaptiveScale;

    // Clamp delta time with adaptive thresholds
    const clampedDeltaTime = Math.min(
      effectiveDeltaTime,
      this.adaptiveConfig.maxFrameTime / 1000
    );

    this.lastTime = currentTime;

    // Update bodies using batch frequency-based scheduling
    this.updateBodiesByFrequency(clampedDeltaTime);

    this.animationFrameId = requestAnimationFrame(this.update);
  };

  /**
   * Adds a single physics body to the engine.
   */
  addBody(options: ElementConfig): PhysicsBody {
    const element = options.element;
    const mass = options.mass
      ?? parseFloat(element.getAttribute('data-gravity-mass') ?? '1');

    const elasticity = options.elasticity
      ?? parseFloat(element.getAttribute('data-gravity-elasticity') ?? '0.6');

    const friction = options.friction
      ?? parseFloat(element.getAttribute('data-gravity-friction') ?? '0.3');

    const elementAirDrag = options.airDrag
      ?? parseFloat(element.getAttribute('data-gravity-air-drag') ?? String(this.airDrag));

    const useSpring = options.useSpring
      ?? element.hasAttribute('data-gravity-spring');

    const springStiffness = options.springStiffness
      ?? parseFloat(element.getAttribute('data-gravity-spring-stiffness') ?? '150');

    const springDamping = options.springDamping
      ?? parseFloat(element.getAttribute('data-gravity-spring-damping') ?? '10');

    const fixedPosition = options.fixedPosition
      ?? element.hasAttribute('data-gravity-fixed');

    // Get update frequency from data attribute or options
    const updateFrequency = options.updateFrequency ?? ((): UpdateFrequency => {
      const freqAttr = element.getAttribute('data-gravity-update-frequency');
      if (freqAttr) {
        return Object.values(UpdateFrequency).find((f) => f === freqAttr) || UpdateFrequency.MEDIUM;
      }
      return UpdateFrequency.MEDIUM;
    })();

    const rawTarget = options.springTarget;
    const targetVector = rawTarget
      ? new Vector2(rawTarget.x, rawTarget.y)
      : new Vector2(
          parseFloat(element.getAttribute('data-gravity-spring-target-x') ?? '0'),
          parseFloat(element.getAttribute('data-gravity-spring-target-y') ?? '0'),
        );

    const body = new PhysicsBody({
      element, mass, elasticity, friction, airDrag: elementAirDrag,
      useSpring, spring: { stiffness: springStiffness, damping: springDamping, target: targetVector },
      fixedPosition, updateFrequency
    });

    if (element.hasAttribute('data-gravity') && this.isRunning) {
      const rect = element.getBoundingClientRect();
      body.resetPosition(rect.left, -rect.height - 50);
      body.setVelocity(0, 0);
    }

    this.bodies.push(body);
    return body;
  }

  /**
   * Adds multiple physics bodies from a collection of elements.
   */
  addBodies(elements: HTMLElement[]): PhysicsBody[] {
    return elements.map((el) => this.addBody({ element: el }));
  }

  /**
   * Adds physics bodies from DOM elements matching a CSS selector.
   */
  addFromSelector(selector: string): PhysicsBody[] {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    return this.addBodies(elements);
  }

  /**
   * Removes a physics body from the engine.
   */
  removeBody(body: PhysicsBody): void {
    const idx = this.bodies.indexOf(body);
    if (idx !== -1) {
      this.bodies.splice(idx, 1);
      // Re-categorize bodies after removal
      this.categorizeBodiesByFrequency();
    }
  }

  /**
   * Returns a copy of all physics bodies.
   */
  getBodies(): PhysicsBody[] {
    return [...this.bodies];
  }

  /**
   * Finds a physics body by its associated DOM element.
   */
  getBodyByElement(element: HTMLElement): PhysicsBody | undefined {
    return this.bodies.find((b) => b.element === element);
  }

  /**
   * Starts the animation loop.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = 0;
    this.frameCount = 0;
    this.animationFrameId = requestAnimationFrame(this.update);
    window.addEventListener('resize', this.resizeHandler);

    // Categorize bodies by frequency upon start
    this.categorizeBodiesByFrequency();
  }

  /**
   * Stops the animation loop.
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    window.removeEventListener('resize', this.resizeHandler);
  }

  /**
   * Toggles the animation loop state.
   */
  toggle(): void {
    this.isRunning ? this.stop() : this.start();
  }

  get running(): boolean { return this.isRunning; }
  checkRunning(): boolean { return this.isRunning; }

  /**
   * Sets the gravity vector.
   */
  setGravity(x: number, y: number): void {
    this.gravity.set(x, y);
  }

  /**
   * Sets the global time scale and updates all physics bodies.
   */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
    if (this.adaptiveConfig.enabled) {
      // Update the time scale curve to use the new scale value
      const originalCurve = this.adaptiveConfig.timeScaleCurve;
      this.adaptiveConfig.timeScaleCurve = (load: number) => {
        return originalCurve(load) * scale;
      };
    }
  }

  /**
   * Enables or disables adaptive time scaling.
   */
  setAdaptiveTime(enabled: boolean): void {
    this.adaptiveConfig.enabled = enabled;
    if (enabled) {
      // Recalculate time scale with current CPU load
      this.timeScale = this.calculateAdaptiveTimeScale(this.cpuMetrics.load);
    }
  }

  /**
   * Updates the adaptive time configuration thresholds.
   */
  updateAdaptiveConfig(config: Partial<AdaptiveTimeConfig>): void {
    Object.assign(this.adaptiveConfig, config);
    if (this.isRunning) {
      this.timeScale = this.calculateAdaptiveTimeScale(this.cpuMetrics.load);
    }
  }

  /**
   * Gets the current CPU performance metrics.
   */
  getCPUMetrics(): CPUMetrics {
    return { ...this.cpuMetrics };
  }

  /**
   * Manually triggers a CPU performance measurement.
   */
  measurePerformance(): void {
    if (typeof requestAnimationFrame !== 'undefined') {
      const currentTime = performance.now();
      this.measureCPUPerformance(currentTime);
    }
  }

  /**
   * Applies a global impulse to all physics bodies.
   */
  applyGlobalImpulse(x: number, y: number): void {
    const impulse = new Vector2(x, y);
    this.bodies.forEach((b) => b.applyImpulse(impulse));
  }

  /**
   * Resets all physics bodies to their original positions.
   */
  resetAll(): void {
    this.bodies.forEach((b) => b.resetToOriginal());
  }

  /**
   * Drops all physics bodies from above the viewport.
   */
  dropAll(): void {
    this.bodies.forEach((b) => {
      const rect = b.element.getBoundingClientRect();
      b.resetPosition(rect.left, -b.height - 50);
      b.setVelocity(0, 0);
    });
  }

  /**
   * Logs current performance metrics to the console.
   */
  logPerformance(): void {
    // Performance logging removed for production use
  }
}
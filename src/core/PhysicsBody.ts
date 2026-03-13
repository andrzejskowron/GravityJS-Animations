import { Vector2 } from './Vector2';

// ============================================================================
// Update Frequency Enum and Configuration
// ============================================================================

/**
 * Categorizes physics bodies by their update frequency requirements.
 */
export enum UpdateFrequency {
  HIGH = 'high',      // 60fps - Bouncing elements, badges (16ms delta)
  MEDIUM = 'medium',  // 45-50fps - Cards, buttons (22ms delta)
  LOW = 'low'         // 30-35fps - Static content with interactions (33ms delta)
}

/**
 * Configuration parameters for each update frequency tier.
 */
export interface FrequencyConfig {
  targetFPS: number;
  deltaTime: number;           // Time per frame in seconds
  sleepVelocityThreshold: number;
  updateInterval: number;      // Frames between updates
}

/**
 * Static configuration defining thresholds and parameters for each frequency tier.
 */
export const FrequencyConfigurations: Record<UpdateFrequency, FrequencyConfig> = {
  [UpdateFrequency.HIGH]: {
    targetFPS: 60,
    deltaTime: 0.016,          // 16ms per frame at 60fps
    sleepVelocityThreshold: 0.3,
    updateInterval: 1          // Update every frame - no skipping for smooth animations
  },
  [UpdateFrequency.MEDIUM]: {
    targetFPS: 60,           // Changed from 48 to maintain responsiveness
    deltaTime: 0.017,        // ~17ms per frame at 60fps (was 21ms)
    sleepVelocityThreshold: 0.5,
    updateInterval: 1          // Update every frame - no skipping for smooth animations
  },
  [UpdateFrequency.LOW]: {
    targetFPS: 60,           // Changed from 33 to maintain responsiveness
    deltaTime: 0.017,        // ~17ms per frame at 60fps (was 30ms)
    sleepVelocityThreshold: 1.0,
    updateInterval: 1          // Update every frame - no skipping for smooth animations
  }
};

// ============================================================================
// Spring Configuration (existing)
// ============================================================================

export interface SpringConfig {
  stiffness: number;
  damping: number;
  target: Vector2;
}

export interface PhysicsBodyOptions {
  element: HTMLElement;
  mass?: number;
  elasticity?: number;
  friction?: number;
  airDrag?: number;
  useSpring?: boolean;
  spring?: SpringConfig;
  fixedPosition?: boolean;
  initialSleep?: boolean;
  /** Assigned update frequency category */
  updateFrequency?: UpdateFrequency;
}

export interface SleepThresholds {
  velocityThreshold: number;   // Velocity below this triggers sleep
  positionTolerance: number;   // Position tolerance for ground detection
}

// ============================================================================
// PhysicsBody Class (enhanced with frequency support)
// ============================================================================

/**
 * PhysicsBody - Represents a DOM element with physics properties.
 * Handles position, velocity, acceleration, and boundary collisions.
 * Supports frequency-based update scheduling for optimized performance.
 */
export class PhysicsBody {
  position!: Vector2;
  velocity!:Vector2;
  acceleration!:Vector2;
  mass: number;
  elasticity: number;
  friction: number;
  airDrag: number;
  element: HTMLElement;
  width: number = 0;
  height: number = 0;
  useSpring: boolean;
  spring: SpringConfig;
  fixedPosition: boolean;
  isSleeping: boolean = false;
  groundY: number = 0;
  rightBound: number = 0;
  originalPosition!: Vector2;

  // Frequency-specific properties
  public updateFrequency: UpdateFrequency;
  private lastUpdateFrame: number = 0;

  // Sleep state tracking
  private sleepVelocity: Vector2 = new Vector2(0, 0);
  private wasSleeping: boolean = false; // Tracks previous sleep state for automatic transitions

  // Sleep thresholds configuration
  public static DEFAULT_SLEEP_THRESHOLD: number = 0.5;
  public static DEFAULT_POSITION_TOLERANCE: number = 1;

  private isInitialized: boolean = false;

  constructor(options: PhysicsBodyOptions) {
    this.element = options.element;
    this.mass = options.mass ?? 1;
    this.elasticity = options.elasticity ?? 0.6;
    this.friction = options.friction ?? 0.3;
    this.airDrag = options.airDrag ?? 0.01;
    this.useSpring = options.useSpring ?? false;
    this.fixedPosition = options.fixedPosition ?? false;
    this.updateFrequency = options.updateFrequency ?? UpdateFrequency.MEDIUM;
    this.spring = options.spring ?? { stiffness: 150, damping: 10, target: new Vector2(0, 0) };

    // Initialize sleep state if requested
    if (options.initialSleep) {
      this.isSleeping = true;
      this.sleepVelocity = new Vector2(this.velocity.x, this.velocity.y);
    }

    this.initializePhysics();
  }

  private initializePhysics(): void {
    if (this.isInitialized) return;
    const rect = this.element.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    const dataX = this.element.getAttribute('data-gravity-x');
    const dataY = this.element.getAttribute('data-gravity-y');
    let initialX: number;
    let initialY: number;

    if (dataX !== null && dataY !== null) {
      initialX = parseFloat(dataX);
      initialY = parseFloat(dataY);
    } else {
      const parentRect = this.element.parentElement?.getBoundingClientRect();
      initialX = parentRect ? rect.left - parentRect.left : rect.left;
      initialY = parentRect ? rect.top - parentRect.top : rect.top;
    }

    this.originalPosition = new Vector2(initialX, initialY);
    this.position = new Vector2(initialX, initialY);
    this.velocity = new Vector2(0, 0);
    this.acceleration = new Vector2(0, 0);

    if (this.element.parentElement) {
      this.element.style.position = 'absolute';
      this.element.style.left = '0px';
      this.element.style.top = '0px';
      this.element.style.margin = '0px';
      this.element.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`;
    }

    const parentH = this.element.parentElement?.clientHeight ?? window.innerHeight;
    const parentW = this.element.parentElement?.clientWidth ?? window.innerWidth;
    this.groundY = parentH - this.height;
    this.rightBound = parentW - this.width;
    this.isInitialized = true;
  }

  updateGroundPosition(): void {
    this.groundY = window.innerHeight - this.height;
  }

  applyForce(force: Vector2): void {
    if (this.fixedPosition) return;
    this.acceleration = this.acceleration.add(force.divide(this.mass));
  }

  applyGravity(gravity: Vector2): void {
    if (this.fixedPosition) return;
    this.applyForce(gravity.multiply(this.mass));
  }

  applyDrag(): void {
    if (this.fixedPosition) return;
    this.applyForce(this.velocity.multiply(-this.airDrag * this.mass));
  }

  applySpringForce(): void {
    if (!this.useSpring || this.fixedPosition) return;
    const displacement = this.position.subtract(this.spring.target);
    const springForce = displacement.multiply(-this.spring.stiffness);
    const dampingForce = this.velocity.multiply(-this.spring.damping);
    this.applyForce(springForce.add(dampingForce));
  }

  handleCollisions(): void {
    if (this.fixedPosition) return;
    if (this.position.y >= this.groundY) {
      this.position.y = this.groundY;
      this.velocity.y = -this.velocity.y * this.elasticity;
      this.velocity.x = this.velocity.x * (1 - this.friction);
      if (Math.abs(this.velocity.y) < 1) this.velocity.y = 0;
    }
    if (this.position.x <= 0) { this.position.x = 0; this.velocity.x = -this.velocity.x * this.elasticity; }
    if (this.position.x >= this.rightBound) { this.position.x = this.rightBound; this.velocity.x = -this.velocity.x * this.elasticity; }
    if (this.position.y <= 0) { this.position.y = 0; this.velocity.y = -this.velocity.y * this.elasticity; }
  }

  /**
   * Puts the physics body to sleep, reducing CPU calculations during high load.
   */
  sleep(): void {
    if (!this.isSleeping) {
      this.isSleeping = true;
      // Store current velocity for wake-up
      this.sleepVelocity = new Vector2(this.velocity.x, this.velocity.y);
      this.acceleration.set(0, 0);

    }
  }

  /**
   * Wakes the physics body from sleep, resuming full physics calculations.
   */
  wake(): void {
    if (this.isSleeping) {
      this.isSleeping = false;

      // Restore velocity from sleep state and apply any accumulated changes
      const restoredVelocity = new Vector2(this.sleepVelocity.x, this.sleepVelocity.y);

      // If there's been movement during sleep, blend the restored velocity with current velocity
      if (this.velocity.x !== 0 || this.velocity.y !== 0) {
        const blendFactor = 0.7; // Give more weight to restored velocity
        this.velocity.x = this.velocity.x * (1 - blendFactor) + restoredVelocity.x * blendFactor;
        this.velocity.y = this.velocity.y * (1 - blendFactor) + restoredVelocity.y * blendFactor;
      } else {
        this.velocity.set(restoredVelocity.x, restoredVelocity.y);
      }

      // Reset acceleration for active physics calculations
      this.acceleration.set(0, 0);

    }
  }

  /**
   * Updates the physics body with frequency-aware delta time clamping.
   */
  update(deltaTime: number, gravity: Vector2, currentFrame: number = 0): void {
    if (this.fixedPosition) return;

    // First, transition sleep state based on current velocity and position
    this.transitionSleepState();

    // Check if body should be updated based on frequency
    if (!this.shouldBeUpdated(currentFrame)) {
      // For non-updated frames, only update position with stored velocity
      if (this.isSleeping) {
        const dt = Math.min(deltaTime, 0.05);

        // For sleeping bodies: DO NOT move them at all - they should stay put
        this.updateElementPosition();
      }
      return;
    }

    // Handle sleeping bodies - keep them completely stationary while sleeping
    if (this.isSleeping) {
      // Sleeping bodies don't move - just update visual position to match stored position
      this.updateElementPosition();
      return;
    }

    // Apply frequency-specific delta time clamping
    const optimalDt = this.getOptimalDeltaTime(deltaTime);

    this.acceleration = new Vector2(0, 0);
    this.applyGravity(gravity);
    this.applyDrag();
    if (this.useSpring) this.applySpringForce();
    this.velocity = this.velocity.add(this.acceleration.multiply(optimalDt));
    this.position = this.position.add(this.velocity.multiply(optimalDt));
    this.handleCollisions();
    this.updateElementPosition();

    // Update last update frame counter
    this.lastUpdateFrame = currentFrame;
  }

  /**
   * Applies frequency-specific delta time clamping to optimize physics calculations.
   */
  getOptimalDeltaTime(rawDeltaTime: number): number {
    const config = FrequencyConfigurations[this.updateFrequency];
    const maxFrameTime = config.deltaTime * 2; // Allow up to 2x delta time
    const minFrameTime = config.deltaTime * 0.5; // Minimum half of target delta

    return Math.min(Math.max(rawDeltaTime, minFrameTime), maxFrameTime);
  }

  /**
   * Gets the update interval based on the body's frequency category.
   */
  getUpdateInterval(): number {
    return FrequencyConfigurations[this.updateFrequency].updateInterval;
  }

  /**
   * Checks if the physics body should be updated - now always returns true for smooth animations.
   * Update intervals have been removed to ensure all bodies receive consistent physics calculations every frame.
   */
  shouldBeUpdated(currentFrame: number): boolean {
    // Always update every frame for smooth, natural animation behavior
    return true;
  }

  updateElementPosition(): void {
    this.element.style.transform = `translate(${this.position.x}px, ${this.position.y}px)`;
  }

  setVelocity(x: number, y: number): void { this.velocity.set(x, y); }

  applyImpulse(impulse: Vector2): void {
    if (this.fixedPosition) return;
    this.velocity = this.velocity.add(impulse.divide(this.mass));
  }

  resetPosition(x: number, y: number): void {
    this.position.set(x, y);
    this.velocity.set(0, 0);
    this.acceleration.set(0, 0);
    this.updateElementPosition();
  }

  resetToOriginal(): void {
    this.position.set(this.originalPosition.x, this.originalPosition.y);
    this.velocity.set(0, 0);
    this.acceleration.set(0, 0);
    this.updateElementPosition();
  }

  /**
   * Gets the target delta time for the body's current frequency.
   */
  getTargetDeltaTime(): number {
    return FrequencyConfigurations[this.updateFrequency].deltaTime;
  }

  /**
   * Updates the body's frequency category and recalculates associated properties.
   */
  setUpdateFrequency(frequency: UpdateFrequency): void {
    if (this.updateFrequency !== frequency) {
      this.updateFrequency = frequency;


      // Recalculate sleep thresholds based on new frequency
      if (this.isSleeping) {
        this.transitionSleepState();
      }
    }
  }

  /**
   * Checks if the physics body is at rest (suitable for sleeping).
   * Uses frequency-specific velocity thresholds.
   */
  isAtRest(): boolean {
    const config = FrequencyConfigurations[this.updateFrequency];
    const positionTolerance = this.getSleepThresholds().positionTolerance;

    return Math.abs(this.velocity.x) < config.sleepVelocityThreshold &&
           Math.abs(this.velocity.y) < config.sleepVelocityThreshold &&
           this.position.y >= this.groundY - positionTolerance;
  }

  /**
   * Gets the current sleep thresholds configuration.
   * Returns frequency-aware thresholds based on the body's update category.
   */
  getSleepThresholds(): SleepThresholds {
    const config = FrequencyConfigurations[this.updateFrequency];
    return {
      velocityThreshold: config.sleepVelocityThreshold,
      positionTolerance: PhysicsBody.DEFAULT_POSITION_TOLERANCE
    };
  }

  /**
   * Sets custom sleep thresholds for automatic body sleeping.
   */
  setSleepThresholds(thresholds: Partial<SleepThresholds>): void {
    if (thresholds.velocityThreshold !== undefined) {
      // Update the static threshold value directly
      const currentThreshold = PhysicsBody.DEFAULT_SLEEP_THRESHOLD;
      PhysicsBody.DEFAULT_SLEEP_THRESHOLD = thresholds.velocityThreshold;

      // If body is currently sleeping, recalculate based on new threshold
      if (this.isSleeping && Math.abs(currentThreshold - thresholds.velocityThreshold) > 0.1) {
        this.transitionSleepState();
      }
    }
    if (thresholds.positionTolerance !== undefined) {
      // Update the static tolerance value directly
      const currentTolerance = PhysicsBody.DEFAULT_POSITION_TOLERANCE;
      PhysicsBody.DEFAULT_POSITION_TOLERANCE = thresholds.positionTolerance;

      // If body is at rest, re-evaluate sleep state with new tolerance
      if (this.isAtRest() && Math.abs(currentTolerance - thresholds.positionTolerance) > 2) {
        this.transitionSleepState();
      }
    }
  }

  /**
   * Transitions the body's sleep state based on velocity and position analysis.
   * This method should be called during each update cycle to enable automatic sleeping,
   * with frequency-aware timing for optimal performance.
   */
  transitionSleepState(): void {
    const isCurrentlyAtRest = this.isAtRest();

    // Transition from active to sleeping state when at rest
    if (isCurrentlyAtRest && !this.wasSleeping && !this.isSleeping) {
      this.sleep();
      this.wasSleeping = true;
    }
    // Transition from sleeping to active state when movement is detected
    else if (!isCurrentlyAtRest && this.wasSleeping && this.isSleeping) {
      this.wake();
      this.wasSleeping = false;
    }
    // Update wasSleeping flag for bodies that remain in their current state
    else {
      this.wasSleeping = isCurrentlyAtRest;
    }
  }

  /**
   * Gets the current velocity (useful for batch updates).
   */
  getVelocity(): Vector2 {
    return new Vector2(this.velocity.x, this.velocity.y);
  }

  /**
   * Gets the sleep velocity for batch updates.
   */
  getSleepVelocity(): Vector2 {
    return new Vector2(this.sleepVelocity.x, this.sleepVelocity.y);
  }

  getSleepState(): { isSleeping: boolean; wasSleeping: boolean; velocity: Vector2; atRest: boolean };
  getSleepState(): {
    isSleeping: boolean;
    wasSleeping: boolean;
    velocity: Vector2;
    atRest: boolean;
    sleepDuration: number;
  } {
    return {
      isSleeping: this.isSleeping,
      wasSleeping: this.wasSleeping,
      velocity: new Vector2(this.velocity.x, this.velocity.y),
      atRest: this.isAtRest(),
      sleepDuration: this.calculateSleepDuration()
    };
  }

  /**
   * Calculates the duration since the body entered its current sleep state.
   */
  private calculateSleepDuration(): number {
    // This would be enhanced with timestamp tracking in a full implementation
    // For now, returns a placeholder value based on current velocity magnitude
    const velocityMagnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    return this.isSleeping ? (1 / velocityMagnitude) * 10 : 0;
  }

  updateDimensions(): void {
    const rect = this.element.getBoundingClientRect();
    this.width = rect.width;
    this.height =rect.height;
    const parentH = this.element.parentElement?.clientHeight ?? window.innerHeight;
    const parentW = this.element.parentElement?.clientWidth ?? window.innerWidth;
    this.groundY = parentH - this.height;
    this.rightBound = parentW - this.width;
  }
}
/**
 * Vector2 - 2D vector math utility class
 * Used for position, velocity, and force calculations
 */
export class Vector2 {
  constructor(public x: number = 0, public y: number = 0) {}

  static fromAngle(angle: number, magnitude: number): Vector2 {
    return new Vector2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }

  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  add(v: Vector2): Vector2 {
    return new Vector2(this.x + v.x, this.y + v.y);
  }

  subtract(v: Vector2): Vector2 {
    return new Vector2(this.x - v.x, this.y - v.y);
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  divide(scalar: number): Vector2 {
    if (scalar === 0) throw new Error('Cannot divide by zero');
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): Vector2 {
    const mag = this.magnitude();
    return mag === 0 ? new Vector2(0, 0) : this.divide(mag);
  }

  dot(v: Vector2): number {
    return this.x * v.x + this.y * v.y;
  }

  distanceTo(v: Vector2): number {
    return this.subtract(v).magnitude();
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  set(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  addMutate(v: Vector2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  isZero(): boolean {
    return this.x === 0 && this.y === 0;
  }

  toString(): string {
    return `Vector2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }
}


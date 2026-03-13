import { describe, it, expect } from 'vitest';
import { Vector2 } from '../src/core/Vector2';

describe('Vector2', () => {
  it('adds vectors without mutating inputs', () => {
    const a = new Vector2(1, 2);
    const b = new Vector2(3, 4);

    const result = a.add(b);

    expect(result.x).toBe(4);
    expect(result.y).toBe(6);
    // original vectors unchanged
    expect(a.x).toBe(1);
    expect(a.y).toBe(2);
    expect(b.x).toBe(3);
    expect(b.y).toBe(4);
  });

  it('subtracts vectors', () => {
    const a = new Vector2(5, 5);
    const b = new Vector2(2, 3);

    const result = a.subtract(b);

    expect(result.x).toBe(3);
    expect(result.y).toBe(2);
  });

  it('scales and divides vectors', () => {
    const v = new Vector2(2, -4);

    const scaled = v.multiply(3);
    expect(scaled.x).toBe(6);
    expect(scaled.y).toBe(-12);

    const divided = scaled.divide(2);
    expect(divided.x).toBe(3);
    expect(divided.y).toBe(-6);
  });

  it('throws when dividing by zero', () => {
    const v = new Vector2(1, 2);
    expect(() => v.divide(0)).toThrow('Cannot divide by zero');
  });

  it('computes magnitude and normalization', () => {
    const v = new Vector2(3, 4);

    expect(v.magnitude()).toBe(5);
    expect(v.magnitudeSquared()).toBe(25);

    const unit = v.normalize();
    // approximately unit length and direction preserved
    expect(unit.magnitude()).toBeCloseTo(1, 6);
    expect(unit.x).toBeCloseTo(3 / 5, 6);
    expect(unit.y).toBeCloseTo(4 / 5, 6);
  });

  it('handles zero vector normalization safely', () => {
    const zero = new Vector2(0, 0);
    const norm = zero.normalize();

    expect(norm.x).toBe(0);
    expect(norm.y).toBe(0);
  });

  it('computes dot product and distance', () => {
    const a = new Vector2(1, 0);
    const b = new Vector2(0, 1);

    expect(a.dot(b)).toBe(0);

    const c = new Vector2(3, 4);
    const d = new Vector2(0, 0);
    expect(c.distanceTo(d)).toBe(5);
  });

  it('creates vectors from angle and magnitude', () => {
    const v = Vector2.fromAngle(Math.PI / 2, 2);
    expect(v.x).toBeCloseTo(0, 6);
    expect(v.y).toBeCloseTo(2, 6);
  });

  it('computes angle correctly', () => {
    const right = new Vector2(1, 0);
    const up = new Vector2(0, 1);

    expect(right.angle()).toBeCloseTo(0);
    expect(up.angle()).toBeCloseTo(Math.PI / 2, 6);
  });

  it('supports mutation helpers', () => {
    const v = new Vector2(1, 1);
    v.set(2, 3);
    expect(v.x).toBe(2);
    expect(v.y).toBe(3);

    v.addMutate(new Vector2(1, -1));
    expect(v.x).toBe(3);
    expect(v.y).toBe(2);

    expect(v.isZero()).toBe(false);
    v.set(0, 0);
    expect(v.isZero()).toBe(true);
  });

  it('formats toString with two decimal places', () => {
    const v = new Vector2(1.2345, -6.789);
    expect(v.toString()).toBe('Vector2(1.23, -6.79)');
  });
});

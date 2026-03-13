import { describe, it, expect, vi } from 'vitest';
import { GravityEngine } from '../src/core/GravityEngine';
import { UpdateFrequency } from '../src/core/PhysicsBody';

describe('GravityEngine', () => {
  it('categorizes bodies by update frequency', () => {
    const engine = new GravityEngine({ autoStart: false });
    const engineAny = engine as any;

    const highBody = { updateFrequency: UpdateFrequency.HIGH };
    const lowBody = { updateFrequency: UpdateFrequency.LOW };
    const defaultBody = {}; // falls back to MEDIUM

    engineAny.bodies = [highBody, lowBody, defaultBody];

    engine.categorizeBodiesByFrequency();

    const high = engine.getBodiesByFrequency(UpdateFrequency.HIGH);
    const medium = engine.getBodiesByFrequency(UpdateFrequency.MEDIUM);
    const low = engine.getBodiesByFrequency(UpdateFrequency.LOW);

    expect(high).toContain(highBody as any);
    expect(low).toContain(lowBody as any);
    expect(medium).toContain(defaultBody as any);
  });

  it('applies global impulse to all bodies', () => {
    const engine = new GravityEngine({ autoStart: false });
    const engineAny = engine as any;

    const impulseSpy1 = vi.fn();
    const impulseSpy2 = vi.fn();

    const body1 = { applyImpulse: impulseSpy1 };
    const body2 = { applyImpulse: impulseSpy2 };

    engineAny.bodies = [body1, body2];

    engine.applyGlobalImpulse(10, -5);

    expect(impulseSpy1).toHaveBeenCalledTimes(1);
    expect(impulseSpy2).toHaveBeenCalledTimes(1);

    const arg1 = impulseSpy1.mock.calls[0][0];
    const arg2 = impulseSpy2.mock.calls[0][0];

    expect(arg1.x).toBe(10);
    expect(arg1.y).toBe(-5);
    expect(arg2.x).toBe(10);
    expect(arg2.y).toBe(-5);
  });

  it('setGravity updates gravity vector components', () => {
    const engine = new GravityEngine({ autoStart: false });
    engine.setGravity(12, -34);
    expect(engine.gravity.x).toBe(12);
    expect(engine.gravity.y).toBe(-34);
  });

  it('reads physics attributes from data-gravity-* attributes', () => {
    // Provide a minimal window polyfill for PhysicsBody initialisation in Node
    (globalThis as any).window = (globalThis as any).window ?? { innerWidth: 800, innerHeight: 600 };

    const createParent = () => ({
      clientWidth: 500,
      clientHeight: 500,
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 500, height: 500, right: 500, bottom: 500 };
      },
    });

    const attrs: Record<string, string | null> = {
      'data-gravity': '',
      'data-gravity-mass': '2',
      'data-gravity-elasticity': '0.8',
      'data-gravity-friction': '0.4',
      'data-gravity-air-drag': '0.05',
      'data-gravity-spring': '',
      'data-gravity-spring-stiffness': '300',
      'data-gravity-spring-damping': '20',
      'data-gravity-spring-target-x': '10',
      'data-gravity-spring-target-y': '20',
      'data-gravity-x': '5',
      'data-gravity-y': '7',
    };

    const style: Record<string, string> = {};
    const parent = createParent();
    const element: any = {
      style,
      parentElement: parent,
      getAttribute(name: string) {
        return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
      },
      hasAttribute(name: string) {
        return this.getAttribute(name) !== null;
      },
      getBoundingClientRect() {
        return { left: 0, top: 0, width: 50, height: 50, right: 50, bottom: 50 };
      },
    };

    const engine = new GravityEngine({ autoStart: false });
    const body = engine.addBody({ element });

    expect(body.mass).toBeCloseTo(2);
    expect(body.elasticity).toBeCloseTo(0.8);
    expect(body.friction).toBeCloseTo(0.4);
    expect(body.airDrag).toBeCloseTo(0.05);
    expect(body.useSpring).toBe(true);
    expect(body.spring.stiffness).toBeCloseTo(300);
    expect(body.spring.damping).toBeCloseTo(20);
    expect(body.spring.target.x).toBeCloseTo(10);
    expect(body.spring.target.y).toBeCloseTo(20);
  });

});

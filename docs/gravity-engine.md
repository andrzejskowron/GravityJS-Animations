# Gravity Engine

The Gravity Engine makes DOM elements behave like physical objects - they fall under configurable gravity, bounce off the viewport floor, and can be spring-anchored to resting positions. It is completely independent from the UI component system.

## Quick setup via `initGravity()`

```html
<div
  data-gravity
  data-gravity-mass="1.5"
  data-gravity-elasticity="0.7"
  style="width:60px;height:60px;background:#003f5c;border-radius:8px;position:absolute;"
></div>

<script src="./dist/gravityjs.umd.js"></script>
<script>
  const engine = GravityJS.initGravity({ gravity: 980, timeScale: 1 });
  engine.start();
</script>
```

## Body data attributes

Add these to any element to register it as a physics body:

| Attribute | Description |
|---|---|
| `data-gravity` | **Required.** Marks the element as a physics body. |
| `data-gravity-mass` | Simulated mass in kg (default `1`). |
| `data-gravity-elasticity` | Bounciness 0-1 (default `0.5`). |
| `data-gravity-friction` | Surface friction 0-1 (default `0.1`). |
| `data-gravity-air-drag` | Air resistance coefficient (default `0.01`). |
| `data-gravity-spring` | When present, body is spring-anchored to its original position. |
| `data-gravity-spring-stiffness` | Spring stiffness constant k (default `200`). |
| `data-gravity-spring-damping` | Spring damping constant b (default `15`). |
| `data-gravity-spring-target-x` | Custom spring anchor X offset in px. |
| `data-gravity-spring-target-y` | Custom spring anchor Y offset in px. |
| `data-gravity-fixed` | When present, body is immovable (acts as a static collider). |
| `data-gravity-x` / `data-gravity-y` | Optional explicit local X/Y offsets in pixels for the body's starting position. |
| `data-gravity-update-frequency` | Optional update frequency hint: `high`, `medium` (default), or `low`. |

## JavaScript API

### `initGravity(options?): GravityEngine`

Convenience wrapper - scans the DOM for `[data-gravity]` elements, constructs an engine, and returns it.

```ts
import { initGravity } from 'gravityjs-animations';

const engine = initGravity({
  gravity: 980,      // px/s² (default 980)
  timeScale: 1,      // simulation speed multiplier (default 1)
});
engine.start();
```

### `new GravityEngine(options?)`

For full control, construct the engine directly and manage bodies yourself:

```ts
import { GravityEngine } from 'gravityjs-animations';

const engine = new GravityEngine({ gravity: 980, timeScale: 0.8 });

// Add a body from a DOM element
const el = document.getElementById('myBox')!;
engine.addBody(el, { mass: 2, elasticity: 0.6 });

// Add multiple elements at once
engine.addBodies(document.querySelectorAll('.falling-item'));

// Add all matching elements via CSS selector
engine.addFromSelector('[data-gravity]');

engine.start();
```

### Engine control methods

| Method | Description |
|---|---|
| `start()` | Begin the physics simulation loop |
| `stop()` | Pause the simulation |
| `toggle()` | Toggle between running and paused |
| `setGravity(g: number)` | Change gravity at runtime (px/s²) |
| `setTimeScale(s: number)` | Change simulation speed at runtime |
| `dropAll()` | Apply a downward impulse to all bodies |
| `resetAll()` | Reset all bodies to their original positions |
| `applyGlobalImpulse(x, y)` | Apply an impulse vector to every body |
| `getBodies()` | Returns the array of all `PhysicsBody` instances |
| `getBodyByElement(el)` | Returns the `PhysicsBody` for a given DOM element |

### Body methods (via `getBodyByElement`)

```ts
const body = engine.getBodyByElement(el)!;

body.applyImpulse(200, -400);  // push right and up
body.reset();                   // snap back to origin
```

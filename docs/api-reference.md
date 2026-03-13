# API Reference

## `initComponents(root?: HTMLElement): () => void`

Scans `root` (default `document.body`) for all `data-gravity-*` selectors, instantiates the matching component classes, and starts a `MutationObserver` to handle future DOM changes. Returns a teardown function.

## `initGravity(options?): GravityEngine`

Scans `document` for `[data-gravity]` elements, adds them as physics bodies, and returns the engine ready to `start()`.

| Option | Type | Default | Description |
|---|---|---|---|
| `gravity` | `number` | `980` | Downward acceleration in px/s² |
| `timeScale` | `number` | `1` | Simulation speed multiplier |

## `GravityEngine` methods

| Method | Signature | Description |
|---|---|---|
| `addBody` | `(el, opts?) => PhysicsBody` | Register a single element as a body |
| `addBodies` | `(els) => PhysicsBody[]` | Register a NodeList or array of elements |
| `addFromSelector` | `(selector) => PhysicsBody[]` | Register all matching elements |
| `start` | `() => void` | Start simulation loop |
| `stop` | `() => void` | Pause simulation loop |
| `toggle` | `() => void` | Toggle running/paused |
| `setGravity` | `(g: number) => void` | Update gravity at runtime |
| `setTimeScale` | `(s: number) => void` | Update time scale at runtime |
| `dropAll` | `() => void` | Apply downward impulse to all bodies |
| `resetAll` | `() => void` | Reset all bodies to origin positions |
| `applyGlobalImpulse` | `(x, y) => void` | Apply impulse vector to all bodies |
| `getBodies` | `() => PhysicsBody[]` | Return all registered bodies |
| `getBodyByElement` | `(el) => PhysicsBody \| undefined` | Return body for a DOM element |

## `PhysicsBody` members

| Member | Type | Description |
|---|---|---|
| `element` | `HTMLElement` | The managed DOM element |
| `x / y` | `number` | Current position |
| `vx / vy` | `number` | Current velocity |
| `mass` | `number` | Simulated mass |
| `elasticity` | `number` | Bounciness coefficient |
| `applyImpulse(x, y)` | `method` | Apply a velocity impulse |
| `reset()` | `method` | Snap back to origin position |


# Advanced Features

## Motion Blur

Apply a velocity-proportional CSS `blur()` filter to any component by adding `data-gravity-motion-blur`. The numeric value is the blur coefficient (higher = more blur per unit of velocity).

```html
<button data-gravity-button data-gravity-motion-blur="0.06">Blur on move</button>
<div data-gravity-tilt data-gravity-motion-blur="0.04">Tilt with blur</div>
```

## Text Animation (Button)

When `data-gravity-animate-text` is present on a `[data-gravity-button]`, each text character is wrapped in a `<span>` and spring-animated via `translateY` on hover, creating a wave effect.

```html
<button data-gravity-button data-gravity-animate-text>Animate Text</button>
```

## Scoped Initialisation

Pass a root element to `initComponents()` to restrict scanning to a subtree. Useful for modals, drawers, or dynamically inserted sections:

```ts
const modal = document.getElementById('my-modal')!;
const teardown = initComponents(modal);
// Only elements inside #my-modal are initialised
```

## Live Attribute Updates

Change `data-gravity-*` attributes at runtime - the `MutationObserver` inside `initComponents()` detects modifications and reinitialises the affected element automatically.

```js
const btn = document.querySelector('[data-gravity-button]');
btn.setAttribute('data-gravity-scale', '1.2');
btn.setAttribute('data-gravity-material', 'rubber');
// Changes take effect immediately - no manual re-init needed
```

## Programmatic Teardown and Replay

```ts
const teardown = initComponents();

// Later - remove all listeners and the MutationObserver:
teardown();

// Reinitialise (e.g. after a full page section swap):
const newTeardown = initComponents();
```


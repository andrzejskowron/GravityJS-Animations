# GravityJS UI Components

This document details all UI components provided by GravityJS. It is focused on the DOM attributes and behaviours of each component.
For installation, quick start, gravity engine, and framework integration, see the main [README](./README.md).

## Components Overview

Activate any component by adding a `data-gravity-*` attribute to an HTML element. Call `initComponents()` once and GravityJS scans the entire DOM.
The built-in `MutationObserver` automatically handles elements added or removed later by React, Vue, or Angular — no re-initialisation needed.

### Shared physics attributes

Every component accepts these optional per-element overrides:

| Attribute | Range | Description |
|---|---|---|
| `data-gravity-bounce` | `0-1` | Spring bounce intensity |
| `data-gravity-friction` | `0-1` | Damping / how quickly oscillations die away |
| `data-gravity-elasticity` | `0-1` | Spring stiffness - higher = snappier |
| `data-gravity-mass` | number | Simulated mass (affects inertia) |
| `data-gravity-material` | `rigid\|metal\|rubber\|jelly` | Material preset (overrides individual knobs) |
| `data-gravity-motion-blur` | number | Velocity-proportional CSS blur coefficient (e.g. `0.06`) |

---

### Button

Applies a physics-driven scale spring on hover and press. Selector: `[data-gravity-button]`

```html
<!-- Minimal -->
<button data-gravity-button>Default Button</button>

<!-- Fully customised -->
<button data-gravity-button
        data-gravity-scale="1.12"
        data-gravity-bounce="0.8"
        data-gravity-material="jelly"
        data-gravity-motion-blur="0.07">
  Jelly Button
</button>
```

| Attribute | Default | Description |
|---|---|---|
| `data-gravity-scale` | `1.08` | Scale target on hover |
| `data-gravity-animate-text` | - | When present, text children spring-animate via `translateY` |

---

### Card

Hover lifts the card with a scale spring and animated `box-shadow`. Selector: `[data-gravity-card]`

```html
<div data-gravity-card>
  <h3>Fast Performance</h3>
  <p>Hover to lift with a spring.</p>
</div>

<!-- Custom scale and shadow -->
<div data-gravity-card data-gravity-scale="1.06" data-gravity-shadow="30">
  Custom shadow card
</div>
```

| Attribute | Default | Description |
|---|---|---|
| `data-gravity-scale` | `1.04` | Scale on hover |
| `data-gravity-shadow` | `20` | Drop-shadow spread in px on hover |

---

### Accordion

Physics-driven `max-height` spring for expand/collapse panels. Selector: `[data-gravity-accordion]`

Header detection order (first match wins): `[data-gravity-accordion-header]` → `button` / `[role="button"]` → first child.
Content detection order: `[data-gravity-accordion-content]` → `.accordion-content` / `[role="region"]` → second child.

```html
<!-- Auto-detected structure -->
<div data-gravity-accordion>
  <button>Section title</button>
  <div class="accordion-content">
    <div>Body content springs open and closed.</div>
  </div>
</div>

<!-- Explicit slots -->
<div data-gravity-accordion>
  <div data-gravity-accordion-header>Click to toggle</div>
  <div data-gravity-accordion-content>
    <div>This panel uses explicit slot attributes.</div>
  </div>
</div>
```

---

### Menu

Physics scale spring on menu-link hover, with optional slide-in dropdown support. Selector: `[data-gravity-menu]`

The component looks for a sibling `.menu-dropdown` element and springs it open on hover.

```html
<ul>
  <li><a href="#" data-gravity-menu>Home</a></li>
  <li>
    <a href="#" data-gravity-menu>Products</a>
    <!-- sibling .menu-dropdown springs open on hover -->
    <div class="menu-dropdown">
      <a href="#">Item A</a>
      <a href="#">Item B</a>
    </div>
  </li>
  <li><a href="#" data-gravity-menu>Contact</a></li>
</ul>
```

| Attribute | Default | Description |
|---|---|---|
| `data-gravity-scale` | `1.06` | Scale target on hover |

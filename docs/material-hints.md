# Material Hints

Material presets apply coordinated physics parameters in a single attribute, eliminating the need to manually tune `elasticity`, `friction`, `bounce`, and `mass` together.

| Value | Stiffness | Damping | Character |
|---|---|---|---|
| `rigid` | Very high | High | Immediate, no oscillation - solid plastic or wood feel |
| `metal` | High | Medium | Crisp snap with brief ring-out |
| `rubber` | Medium | Low | Stretchy rebound with visible overshoot |
| `jelly` | Low | Very low | Wobbly, prolonged oscillation |

```html
<button data-gravity-button data-gravity-material="rigid">Rigid</button>
<button data-gravity-button data-gravity-material="metal">Metal</button>
<button data-gravity-button data-gravity-material="rubber">Rubber</button>
<button data-gravity-button data-gravity-material="jelly">Jelly</button>
```


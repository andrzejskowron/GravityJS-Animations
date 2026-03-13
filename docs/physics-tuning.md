# Physics Tuning

Fine-tune the feel of any UI component using per-element data attributes. These override the defaults set by the component.

| Goal | data-gravity-elasticity | data-gravity-friction | data-gravity-bounce | data-gravity-mass |
|---|---|---|---|---|
| Snappy / instant | `0.9` | `0.8` | `0.2` | `0.5` |
| Smooth / gentle | `0.3` | `0.5` | `0.4` | `1.5` |
| Bouncy / playful | `0.6` | `0.2` | `0.9` | `0.8` |
| Heavy / inertial | `0.4` | `0.6` | `0.3` | `3.0` |

```html
<!-- Snappy button -->
<button data-gravity-button
        data-gravity-elasticity="0.9"
        data-gravity-friction="0.8">
  Snappy
</button>

<!-- Bouncy card -->
<div data-gravity-card
     data-gravity-bounce="0.9"
     data-gravity-friction="0.2">
  Bouncy Card
</div>
```


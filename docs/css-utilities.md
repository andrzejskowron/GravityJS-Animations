# CSS Utilities

Import the optional stylesheet for ready-made utility classes:

```html
<!-- Local build -->
<link rel="stylesheet" href="./dist/gravityjs.css" />
```

```ts
// npm
import 'gravityjs-animations/dist/gravityjs.css';
```

The stylesheet provides base positioning and `will-change: transform` hints that improve compositing performance for animated elements. All `data-gravity-*` components work without it, but including the stylesheet prevents potential layout shifts for absolutely-positioned physics bodies.

# Framework Integration

`initComponents()` returns a teardown function. Always call it when your component unmounts to remove event listeners and the `MutationObserver`.

## React

```tsx
import { useEffect } from 'react';
import { initComponents } from 'gravityjs-animations';
import 'gravityjs-animations/dist/gravityjs.css'; // optional utility styles

export default function App() {
  useEffect(() => {
    const teardown = initComponents();
    return teardown; // called automatically on unmount
  }, []);

  return (
    <div>
      <button data-gravity-button>Spring Button</button>

      <div data-gravity-card style={{ padding: 24, borderRadius: 12, background: '#fff' }}>
        <h3>Physics Card</h3>
      </div>

      <div data-gravity-scroll>
        <p>Reveals on scroll</p>
      </div>
    </div>
  );
}
```

> **Tip:** The built-in `MutationObserver` handles dynamically rendered elements automatically. You do **not** need to call `initComponents()` again when React re-renders children.

## Vue 3

```vue
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { initComponents } from 'gravityjs-animations';

let teardown: () => void;

onMounted(() => {
  teardown = initComponents();
});

onUnmounted(() => {
  teardown?.();
});
</script>

<template>
  <button data-gravity-button>Spring Button</button>
  <div data-gravity-card>Hover me</div>
  <span data-gravity-badge>5</span>
</template>
```

## Angular

```ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { initComponents } from 'gravityjs-animations';

@Component({
  selector: 'app-root',
  template: `
    <button data-gravity-button>Spring Button</button>
    <div data-gravity-card>Hover me</div>
    <div data-gravity-scroll><p>Scroll reveal</p></div>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  private teardown!: () => void;

  ngOnInit(): void {
    this.teardown = initComponents();
  }

  ngOnDestroy(): void {
    this.teardown?.();
  }
}
```

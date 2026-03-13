import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initComponents } from '../src/index';
import { PhysicsService } from '../src/core/PhysicsService';

/**
 * Component initialisation / teardown tests for `initComponents()`.
 *
 * These exercise the DOM-facing API directly to ensure that:
 *   - Components under a given root are initialised correctly
 *   - The returned teardown function disconnects observers and
 *     stops physics / removes listeners without side effects.
 */

describe('initComponents() integration', () => {
  let originalMutationObserver: typeof MutationObserver;
  let originalAddEventListener: typeof window.addEventListener;
  let originalRemoveEventListener: typeof window.removeEventListener;

  let observeSpy: ReturnType<typeof vi.fn>;
  let disconnectSpy: ReturnType<typeof vi.fn>;
  let addScrollListenerSpy: ReturnType<typeof vi.fn>;
  let removeScrollListenerSpy: ReturnType<typeof vi.fn>;
  let stopSpy: ReturnType<typeof vi.fn>;

  let root: HTMLElement;
  let scrollSection: HTMLElement;

  beforeEach(() => {
    vi.restoreAllMocks();

    document.body.innerHTML = '';
    root = document.createElement('div');

    // Accordion fixture: minimal but structurally realistic.
    const accordion = document.createElement('div');
    accordion.setAttribute('data-gravity-accordion', '');

    const header = document.createElement('button');
    const content = document.createElement('div');
    const body = document.createElement('div');
    // Ensure a non-zero height path for target maxHeight computation.
    Object.defineProperty(body, 'offsetHeight', { value: 120, configurable: true });
    content.appendChild(body);

    accordion.appendChild(header);
    accordion.appendChild(content);
    root.appendChild(accordion);

    // Scroll animation fixture.
    scrollSection = document.createElement('section');
    scrollSection.setAttribute('data-gravity-scroll', '');
    scrollSection.style.transform = '';
    scrollSection.style.opacity = '1';
    root.appendChild(scrollSection);

    document.body.appendChild(root);

    // Stub PhysicsService singleton so tests don't depend on the real animator.
    stopSpy = vi.fn();
    const animateSpy = vi.fn();
    vi.spyOn(PhysicsService, 'getInstance').mockReturnValue({
      animate: animateSpy,
      stop: stopSpy,
    } as unknown as PhysicsService);

    // Stub MutationObserver to verify teardown disconnects it.
    originalMutationObserver = globalThis.MutationObserver;
    observeSpy = vi.fn();
    disconnectSpy = vi.fn();

    class MockMutationObserver {
      callback: (mutations: any[], observer: any) => void;
      constructor(cb: (mutations: any[], observer: any) => void) {
        this.callback = cb;
      }
      observe = observeSpy;
      disconnect = disconnectSpy;
    }

    (globalThis as any).MutationObserver = MockMutationObserver as any;

    // Capture and stub window scroll listeners used by ScrollAnimationComponent.
    originalAddEventListener = window.addEventListener;
    originalRemoveEventListener = window.removeEventListener;

    addScrollListenerSpy = vi.fn();
    removeScrollListenerSpy = vi.fn();

    // Only the calls from ScrollAnimationComponent matter here.
    window.addEventListener = addScrollListenerSpy as any;
    window.removeEventListener = removeScrollListenerSpy as any;
  });

  afterEach(() => {
    document.body.innerHTML = '';

    // Restore globals.
    if (originalMutationObserver) {
      globalThis.MutationObserver = originalMutationObserver;
    } else {
      // In case the environment did not provide one.
      delete (globalThis as any).MutationObserver;
    }

    window.addEventListener = originalAddEventListener;
    window.removeEventListener = originalRemoveEventListener;

    vi.restoreAllMocks();
  });

  it('initialises components under the provided root and returns a teardown function', () => {
    const teardown = initComponents(root);

    expect(typeof teardown).toBe('function');
    // MutationObserver should be attached to the supplied root.
    expect(observeSpy).toHaveBeenCalledTimes(1);
    expect(observeSpy).toHaveBeenCalledWith(root, { childList: true, subtree: true });

    // ScrollAnimationComponent should register a scroll listener on window.
    expect(addScrollListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('teardown disconnects observers, stops physics and removes listeners / styles', () => {
    const teardown = initComponents(root);

    teardown();

    // Observer disconnected once when tearing down.
    expect(disconnectSpy).toHaveBeenCalledTimes(1);

    // BaseComponent.destroy should stop any active physics animations.
    expect(stopSpy).toHaveBeenCalled();

    // ScrollAnimationComponent should unregister its scroll listener.
    expect(removeScrollListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function));

    // ScrollAnimationComponent.destroy restores inline styles back to their
    // natural state so the element is usable after teardown.
    expect(scrollSection.style.transform).toBe('');
    expect(scrollSection.style.opacity).toBe('');
  });
});

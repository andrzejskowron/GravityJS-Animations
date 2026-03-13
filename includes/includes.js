// Component loader - loads shared components from includes directory
(function() {
  /**
   * Load an HTML file and insert its content into a target element
   * @param {string} url - URL of the component to load
   * @param {string|HTMLElement} target - Target selector or element
   */
  async function loadComponent(url, target) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load ${url}`);

      const html = await response.text();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Extract styles and scripts separately
      const styles = tempDiv.querySelectorAll('style');
      const scripts = tempDiv.querySelectorAll('script');

      // Insert styles into head
      styles.forEach(style => {
        if (style.textContent.trim()) {
          document.head.appendChild(style);
        }
      });

      // Find target element and insert content (excluding styles/scripts)
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (el) {
        // Remove all but the first child (the nav/footer element itself)
        while (tempDiv.children.length > 0) {
          el.appendChild(tempDiv.children[0]);
        }
        el.innerHTML = tempDiv.children[0].innerHTML;

        // Execute any scripts from the loaded component
        scripts.forEach(script => {
          const newScript = document.createElement('script');
          if (script.src) {
            newScript.src = script.src;
            document.head.appendChild(newScript);
          } else {
            newScript.textContent = script.textContent;
            document.head.appendChild(newScript);
          }
        });
      }
    } catch (error) {
      // Silently fail for file:// protocol or CORS errors
      if (location.protocol === 'file:' ||
          error.message.includes('Cross origin') ||
          error.message.includes('Fetch API cannot load')) {
        console.log('Component loading skipped (not running on HTTP server):', url);
        return;
      }
      console.error('Component load error:', error);
    }
  }

  /**
   * Initialize all shared components for a page
   */
  function initComponents() {
    // Load navigation if container exists
    const navContainer = document.querySelector('.nav-container');
    if (navContainer) {
      loadComponent('includes/navigation.html', '.nav-container');
    }

    // Load footer before closing body tag
    const footerContainer = document.querySelector('.footer-container');
    if (footerContainer) {
      loadComponent('includes/footer.html', '.footer-container');
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComponents);
  } else {
    // If DOM already loaded, run immediately
    window.requestAnimationFrame(initComponents);
  }

  // Expose for debugging/re-init
  window.loadComponent = loadComponent;
})();

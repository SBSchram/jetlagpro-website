// Centralized Component Loader
// Eliminates duplicate header/footer loading code across all pages
// Bump DEPLOY_VERSION on each deploy so footer/header cache bust
const DEPLOY_VERSION = '20260624021546';

class ComponentLoader {
  constructor() {
    this.cache = new Map();
    this.loadPromises = new Map();
  }

  // Load a component (header, footer, etc.) with caching
  async loadComponent(componentName, targetId) {
    try {
      // Check if already cached
      if (this.cache.has(componentName)) {
        this.injectComponent(targetId, this.cache.get(componentName));
        this.dispatchComponentLoaded(componentName);
        return;
      }

      // Check if already loading (prevent duplicate requests)
      if (this.loadPromises.has(componentName)) {
        const html = await this.loadPromises.get(componentName);
        this.injectComponent(targetId, html);
        this.dispatchComponentLoaded(componentName);
        return;
      }

      // Create new load promise
      const loadPromise = this.fetchComponent(componentName);
      this.loadPromises.set(componentName, loadPromise);

      // Fetch and cache
      const html = await loadPromise;
      this.cache.set(componentName, html);
      this.loadPromises.delete(componentName);

      // Inject into DOM
      this.injectComponent(targetId, html);
      
      // Dispatch events for component-specific initialization
      this.dispatchComponentLoaded(componentName);

    } catch (error) {
      console.error(`Failed to load component ${componentName}:`, error);
      this.showComponentError(targetId, componentName);
    }
  }

  // Fetch component HTML
  async fetchComponent(componentName) {
    // Determine if we're in a subdirectory (like blog/)
    const isSubdirectory = window.location.pathname.includes('/blog/');
    const basePath = isSubdirectory ? '../' : '';
    
    const response = await fetch(`${basePath}${componentName}.html?v=${DEPLOY_VERSION}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  }

  // Inject component into target element
  injectComponent(targetId, html) {
    const target = document.getElementById(targetId);
    if (target) {
      target.innerHTML = html;
    } else {
      console.warn(`Target element #${targetId} not found`);
    }
  }

  // Dispatch component loaded event
  dispatchComponentLoaded(componentName) {
    const event = new CustomEvent(`${componentName}Loaded`, {
      detail: { componentName, timestamp: Date.now() }
    });
    document.dispatchEvent(event);
  }

  // Show error message for failed component loads
  showComponentError(targetId, componentName) {
    const target = document.getElementById(targetId);
    if (target) {
      target.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #666; font-style: italic;">
          Failed to load ${componentName}. <a href="javascript:location.reload()" style="color: #2563eb;">Refresh page</a>
        </div>
      `;
    }
  }

  // Load multiple components in parallel
  async loadComponents(components) {
    const promises = components.map(({ name, target }) => 
      this.loadComponent(name, target)
    );
    await Promise.allSettled(promises);
  }

  // Preload components for faster subsequent loads
  async preloadComponents(componentNames) {
    const promises = componentNames.map(name => 
      this.fetchComponent(name).then(html => this.cache.set(name, html))
    );
    await Promise.allSettled(promises);
  }
}

// Create global instance
window.componentLoader = new ComponentLoader();

// Auto-load components when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const componentsToLoad = [];

  // Auto-detect header elements
  const headerElement = document.getElementById('main-header');
  if (headerElement) {
    componentsToLoad.push({ name: 'header', target: 'main-header' });
  }

  // Auto-detect footer elements  
  const footerElement = document.getElementById('main-footer');
  if (footerElement) {
    componentsToLoad.push({ name: 'footer', target: 'main-footer' });
  }

  // Load detected components
  if (componentsToLoad.length > 0) {
    console.log('🔄 Auto-loading components:', componentsToLoad.map(c => c.name));
    window.componentLoader.loadComponents(componentsToLoad);
  }
});

// Backward compatibility: Expose simple functions for existing code
window.loadHeader = () => window.componentLoader.loadComponent('header', 'main-header');
window.loadFooter = () => window.componentLoader.loadComponent('footer', 'main-footer');

// Global Mobile Menu Functionality
const MOBILE_NAV_MQ = window.matchMedia('(max-width: 768px)');

/**
 * Mobile drawer must not live inside `.header` — `backdrop-filter` there traps
 * `position: fixed` to the header bar height. Portal to `body` on small screens;
 * restore inside `.nav-container` for desktop grid layout (`display: contents`).
 */
function syncNavDrawerPlacement() {
    const drawer = document.getElementById('navLinks');
    const container = document.querySelector('.nav-container');
    if (!drawer || !container) {
        return;
    }

    if (MOBILE_NAV_MQ.matches) {
        if (drawer.parentElement !== document.body) {
            document.body.appendChild(drawer);
        }
        return;
    }

    const toggle = container.querySelector('.mobile-menu-toggle');
    if (toggle && drawer.parentElement !== container) {
        toggle.insertAdjacentElement('afterend', drawer);
    }
}

function setMobileNavOpen(isOpen) {
    const navDrawer = document.getElementById('navLinks');
    const menuToggle = document.querySelector('.mobile-menu-toggle');

    if (!navDrawer || !menuToggle) {
        return;
    }

    navDrawer.classList.toggle('active', isOpen);
    menuToggle.classList.toggle('active', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    navDrawer.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    document.body.classList.toggle('nav-open', isOpen);
}

window.toggleMobileMenu = function() {
    syncNavDrawerPlacement();
    const navDrawer = document.getElementById('navLinks');
    setMobileNavOpen(!navDrawer?.classList.contains('active'));
};

// Initialize mobile menu event listeners when header is loaded
document.addEventListener('headerLoaded', () => {
    syncNavDrawerPlacement();

    // Always start from a closed state after header injection/bfcache restore.
    setMobileNavOpen(false);

    if (!window.__navDrawerPlacementBound) {
        window.__navDrawerPlacementBound = true;
        window.addEventListener('resize', () => {
            setMobileNavOpen(false);
            syncNavDrawerPlacement();
        });
        if (typeof MOBILE_NAV_MQ.addEventListener === 'function') {
            MOBILE_NAV_MQ.addEventListener('change', () => {
                setMobileNavOpen(false);
                syncNavDrawerPlacement();
            });
        }
    }

    // Close mobile menu when clicking on a link
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => setMobileNavOpen(false));
        });

        navLinks.querySelectorAll('[data-nav-close]').forEach(el => {
            el.addEventListener('click', () => setMobileNavOpen(false));
        });
    }

    document.addEventListener('keydown', (e) => {
        const navDrawer = document.getElementById('navLinks');
        if (e.key === 'Escape' && navDrawer?.classList.contains('active')) {
            setMobileNavOpen(false);
        }
    });
});

// Safari/iOS back-forward cache can restore stale open state.
window.addEventListener('pageshow', () => {
    syncNavDrawerPlacement();
    setMobileNavOpen(false);
});
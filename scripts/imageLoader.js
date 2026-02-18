// Image loading utility with WebP support and lazy loading
class ImageLoader {
  constructor() {
    this.supportsWebP = null;
    this.observer = null;
    this.checkWebPSupport();
    this.initIntersectionObserver();
  }

  // Check if browser supports WebP
  async checkWebPSupport() {
    if (this.supportsWebP !== null) return this.supportsWebP;
    
    return new Promise((resolve) => {
      const webp = new Image();
      webp.onload = webp.onerror = () => {
        this.supportsWebP = webp.height === 2;
        resolve(this.supportsWebP);
      };
      webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  // Initialize Intersection Observer for lazy loading
  initIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '50px', // Start loading 50px before image enters viewport
      threshold: 0.01
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          this.loadImage(img);
          this.observer.unobserve(img);
        }
      });
    }, options);
  }

  // Convert PNG sprite URL to optimized format
  getOptimizedSpriteUrl(spriteId) {
    // Use standard PokeAPI sprites - browser will cache these
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`;
  }

  // Get high-quality artwork URL
  getArtworkUrl(spriteId) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${spriteId}.png`;
  }

  // Load image with error fallback
  loadImage(img) {
    const src = img.dataset.src;
    const fallback = img.dataset.fallback;
    
    if (!src) return;

    img.classList.add('loading');
    
    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = src;
      img.classList.remove('loading');
      img.classList.add('loaded');
    };
    
    tempImg.onerror = () => {
      if (fallback && fallback !== src) {
        img.dataset.src = fallback;
        this.loadImage(img);
      } else {
        img.classList.remove('loading');
        img.classList.add('error');
        // Use a placeholder SVG
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="40"%3E?%3C/text%3E%3C/svg%3E';
      }
    };
    
    tempImg.src = src;
  }

  // Observe an image element for lazy loading
  observe(img) {
    if (!this.observer) return;
    this.observer.observe(img);
  }

  // Observe all images with data-src attribute
  observeAll() {
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => this.observe(img));
  }

  // Disconnect observer (cleanup)
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Export singleton instance
window.imageLoader = new ImageLoader();

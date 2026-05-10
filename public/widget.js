(function() {
  const DEFAULT_BASE = 'https://tipstack.fun';
  const BASE_URL = window.TIPSTACK_BASE_URL || document.currentScript?.dataset.baseUrl || DEFAULT_BASE;
  const IFRAME_BASE = `${BASE_URL}/checkout`;

  class TipStackWidget {
    constructor() {
      this.init();
    }

    init() {
      // Find all buttons with data-tipstack-id
      const targets = document.querySelectorAll('[data-tipstack-id]');
      targets.forEach(target => {
        if (target.dataset.tipstackInitialized) return;
        this.renderButton(target);
        target.dataset.tipstackInitialized = 'true';
      });

      // Listen for messages from the iframe
      window.addEventListener('message', (event) => {
        if (!event.origin.startsWith(BASE_URL)) return;
        
        if (event.data === 'tipstack-close') {
          this.closeModal();
        }

        if (event.data?.type === 'tipstack-success') {
          console.log('âœ… TipStack: Payment successful!');
          // You could trigger confetti here if a library is present
          setTimeout(() => this.closeModal(), 5000);
        }
      });
    }

    renderButton(container) {
      const wallet = container.dataset.tipstackId;
      const theme = container.dataset.tipstackTheme || 'dark';
      const color = container.dataset.tipstackColor || '#00D265';

      const button = document.createElement('button');
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        Tip me on TipStack
      `;
      
      const isDark = theme === 'dark';
      Object.assign(button.style, {
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: color,
        color: '#000',
        padding: '12px 24px',
        borderRadius: '12px',
        fontWeight: '800',
        fontSize: '14px',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      });

      button.onmouseover = () => {
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
      };
      button.onmouseout = () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.15)';
      };

      button.onclick = () => this.openModal(wallet, theme, color);
      
      container.appendChild(button);
    }

    openModal(wallet, theme, color) {
      if (this.modal) return;

      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0,
        transition: 'opacity 0.3s ease'
      });

      const container = document.createElement('div');
      Object.assign(container.style, {
        width: '100%',
        maxWidth: '480px',
        height: '650px',
        backgroundColor: theme === 'dark' ? '#0d1117' : '#ffffff',
        borderRadius: '32px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        transform: 'scale(0.9)',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      });

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      Object.assign(closeBtn.style, {
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: theme === 'dark' ? '#fff' : '#000',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });
      closeBtn.onclick = () => this.closeModal();

      const iframe = document.createElement('iframe');
      iframe.src = `${IFRAME_BASE}/${wallet}?embed=true&theme=${theme}&accent=${encodeURIComponent(color)}`;
      Object.assign(iframe.style, {
        width: '100%',
        height: '100%',
        border: 'none'
      });
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');

      container.appendChild(closeBtn);
      container.appendChild(iframe);
      overlay.appendChild(container);
      document.body.appendChild(overlay);

      // Trigger animation
      setTimeout(() => {
        overlay.style.opacity = 1;
        container.style.transform = 'scale(1)';
      }, 10);

      this.modal = overlay;
      document.body.style.overflow = 'hidden';
    }

    closeModal() {
      if (!this.modal) return;
      this.modal.style.opacity = 0;
      this.modal.querySelector('div').style.transform = 'scale(0.9)';
      setTimeout(() => {
        document.body.removeChild(this.modal);
        this.modal = null;
        document.body.style.overflow = '';
      }, 300);
    }
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TipStackWidget());
  } else {
    new TipStackWidget();
  }
})();

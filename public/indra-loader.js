(function() {
  if (window.IndraWidgetLoaded) return;
  window.IndraWidgetLoaded = true;

  const scriptTag = document.currentScript;
  const projectId = scriptTag.getAttribute('data-project-id') || 'default';

  const style = document.createElement('style');
  style.innerHTML = `
    #indra-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; font-family: sans-serif; }
    #indra-iframe { width: 380px; height: 600px; max-height: calc(100vh - 100px); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); display: none; margin-bottom: 16px; background: #0f172a; transition: opacity 0.3s ease; overflow: hidden; }
    #indra-toggle-btn { width: 60px; height: 60px; border-radius: 30px; background: linear-gradient(135deg, #9333ea, #6366f1); color: white; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4); display: flex; justify-content: center; align-items: center; transition: transform 0.2s, box-shadow 0.2s; }
    #indra-toggle-btn:hover { transform: scale(1.05); box-shadow: 0 6px 16px rgba(147, 51, 234, 0.6); }
    #indra-toggle-btn svg { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 2; }
    @media (max-width: 480px) { #indra-iframe { width: calc(100vw - 40px); } }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'indra-widget-container';

  const iframe = document.createElement('iframe');
  iframe.id = 'indra-iframe';
  iframe.src = `https://indra.ialksng.me/widget?projectId=${projectId}`;
  iframe.allow = "camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write";

  const button = document.createElement('button');
  button.id = 'indra-toggle-btn';

  const chatIcon = `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
  const closeIcon = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  button.innerHTML = chatIcon;

  let isOpen = false;
  button.onclick = () => {
    isOpen = !isOpen;
    iframe.style.display = isOpen ? 'block' : 'none';
    button.innerHTML = isOpen ? closeIcon : chatIcon;
  };

  container.appendChild(iframe);
  container.appendChild(button);
  document.body.appendChild(container);

  window.addEventListener('message', (event) => {
    if (!event.origin.includes('indra.ialksng.me') && !event.origin.includes('localhost')) return; 

    const data = event.data;

    if (data && data.type === 'INDRA_ACTION') {
      const { action, selector, value } = data.payload;
      console.log(`[Indra Agent] Executing: ${action} on ${selector}`);

      try {
        const element = document.querySelector(selector);
        
        if (!element) {
          console.warn(`[Indra Agent] Element not found: ${selector}`);
          return;
        }

        switch (action) {
          case 'click':
            element.click();
            break;
          case 'fill':
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          case 'navigate':
            window.location.href = value;
            break;
          case 'scroll':
            element.scrollIntoView({ behavior: 'smooth' });
            break;
          default:
            console.warn(`[Indra Agent] Unknown action: ${action}`);
        }
      } catch (error) {
        console.error('[Indra Agent] Action failed:', error);
      }
    }
  });
})();
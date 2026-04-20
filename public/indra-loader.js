(function() {
  if (window.IndraWidgetLoaded) return;
  window.IndraWidgetLoaded = true;

  const scriptTag = document.currentScript;
  const projectId = scriptTag.getAttribute('data-project-id') || 'default';

  // --- SHADOW DOM WRAPPER (Prevents host CSS leakage) ---
  const host = document.createElement('div');
  host.id = 'indra-agent-root';
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const container = document.createElement('div');
  container.id = 'indra-widget-container';
  
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    #indra-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: flex-end; font-family: sans-serif; }
    #indra-iframe { 
      width: 380px; height: 600px; max-height: calc(100vh - 100px); 
      border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; 
      box-shadow: 0 10px 40px rgba(0,0,0,0.3); display: none; 
      margin-bottom: 16px; background: #0f172a; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
      overflow: hidden; opacity: 0; transform: translateY(10px);
    }
    #indra-iframe.visible { display: block; opacity: 1; transform: translateY(0); }
    #indra-toggle-btn { 
      width: 60px; height: 60px; border-radius: 30px; 
      background: linear-gradient(135deg, #9333ea, #6366f1); color: white; 
      border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4); 
      display: flex; justify-content: center; align-items: center; 
      transition: transform 0.2s, box-shadow 0.2s; 
    }
    #indra-toggle-btn:hover { transform: scale(1.05); box-shadow: 0 6px 16px rgba(147, 51, 234, 0.6); }
    #indra-toggle-btn svg { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 2; }
    
    @keyframes indraAgentPulse {
      0% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0.7); outline: 2px solid #9333ea; }
      70% { box-shadow: 0 0 0 10px rgba(147, 51, 234, 0); outline: 2px solid rgba(147, 51, 234, 0.5); }
      100% { box-shadow: 0 0 0 0 rgba(147, 51, 234, 0); outline: transparent; }
    }
    .indra-highlight { animation: indraAgentPulse 1s ease-out forwards; }
    @media (max-width: 480px) { #indra-iframe { width: calc(100vw - 40px); } }
  `;

  const iframe = document.createElement('iframe');
  iframe.id = 'indra-iframe';
  iframe.src = `https://indra.ialksng.me/#/widget?projectId=${projectId}`;
  iframe.allow = "camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write";
  iframe.frameBorder = "0";

  const button = document.createElement('button');
  button.id = 'indra-toggle-btn';
  const chatIcon = `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
  const closeIcon = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  button.innerHTML = chatIcon;

  let isOpen = false;
  button.onclick = () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframe.classList.add('visible');
      button.innerHTML = closeIcon;
    } else {
      iframe.classList.remove('visible');
      button.innerHTML = chatIcon;
    }
  };

  shadow.appendChild(style);
  container.appendChild(iframe);
  container.appendChild(button);
  shadow.appendChild(container);

  // --- AUTOMATION UTILITIES ---
  const highlight = (el) => {
    el.classList.add('indra-highlight');
    setTimeout(() => el.classList.remove('indra-highlight'), 1200);
  };

  // --- MESSAGE HUB ---
  window.addEventListener('message', (event) => {
    if (!event.origin.includes('indra.ialksng.me') && !event.origin.includes('localhost')) return;

    const { type, payload } = event.data;

    if (type === 'REQUEST_DOM_MAP') {
      const elements = document.querySelectorAll('a, button, input, select, textarea, [role="button"]');
      const map = Array.from(elements)
        .filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && !el.closest('#indra-agent-root');
        })
        .map((el, i) => {
          const id = `indra-el-${i}`;
          el.setAttribute('data-indra-id', id);
          return {
            type: el.tagName.toLowerCase(),
            text: (el.innerText || el.placeholder || el.value || el.ariaLabel || '').trim().substring(0, 50),
            selector: `[data-indra-id="${id}"]`
          };
        });
      iframe.contentWindow.postMessage({ type: 'DOM_MAP_RESPONSE', payload: map }, '*');
    }

    if (type === 'INDRA_ACTION') {
      const { action, selector, value } = payload;
      const element = document.querySelector(selector);
      if (!element) return console.warn("[Indra] Target lost:", selector);

      highlight(element);
      
      switch (action) {
        case 'click': 
          element.click(); 
          break;
        case 'fill': 
          element.value = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        case 'scroll': 
          element.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
          break;
        case 'navigate': 
          window.location.href = value; 
          break;
      }
    }

    // New: Handle dynamic iframe resizing (e.g. for vault expansion)
    if (type === 'SET_WIDGET_SIZE') {
        iframe.style.width = payload.width || '380px';
        iframe.style.height = payload.height || '600px';
    }
  });
})();
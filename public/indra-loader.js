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
    #indra-widget-container { 
      position: fixed; 
      bottom: 24px; 
      right: 24px; 
      z-index: 2147483647; 
      display: flex; 
      flex-direction: column; 
      align-items: flex-end; 
      font-family: system-ui, sans-serif; 
    }
    #indra-iframe { 
      width: 380px; 
      height: 600px; 
      max-height: calc(100vh - 120px); 
      border: 1px solid rgba(255,255,255,0.1); 
      border-radius: 16px; 
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); 
      display: none; 
      margin-bottom: 20px; 
      background: #0b0f1a; 
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); 
      overflow: hidden; 
      opacity: 0; 
      transform: translateY(20px) scale(0.95);
      transform-origin: bottom right;
    }
    #indra-iframe.visible { 
      display: block; 
      opacity: 1; 
      transform: translateY(0) scale(1); 
    }
    
    /* ⚡ Premium Thunderbolt Button */
    #indra-toggle-btn { 
      width: 88px; /* 5.5rem */
      height: 88px; 
      border-radius: 9999px; 
      background: linear-gradient(to bottom right, #f59e0b, #f97316); 
      color: #000; 
      border: none; 
      cursor: pointer; 
      box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.5); 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); 
    }
    #indra-toggle-btn:hover { 
      transform: scale(1.05); 
    }
    #indra-toggle-btn.open {
      background: rgba(255, 255, 255, 0.1);
      transform: rotate(45deg);
      color: #fff;
      box-shadow: none;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    #indra-toggle-btn svg { 
      width: 32px; 
      height: 32px; 
    }
    
    @keyframes indraAgentPulse {
      0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); outline: 2px solid #f59e0b; }
      70% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); outline: 2px solid rgba(245, 158, 11, 0.5); }
      100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); outline: transparent; }
    }
    .indra-highlight { animation: indraAgentPulse 1s ease-out forwards; border-radius: inherit; }
    @media (max-width: 480px) { #indra-iframe { width: calc(100vw - 48px); } }
  `;

  const iframe = document.createElement('iframe');
  iframe.id = 'indra-iframe';
  iframe.src = `https://indra.ialksng.me/#/widget?projectId=${projectId}`;
  iframe.allow = "camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write";
  iframe.frameBorder = "0";

  const button = document.createElement('button');
  button.id = 'indra-toggle-btn';
  
  // ⚡ Updated to match Lucide Zap/X icons
  const chatIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
  const closeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
  
  button.innerHTML = chatIcon;

  let isOpen = false;
  button.onclick = () => {
    isOpen = !isOpen;
    if (isOpen) {
      iframe.classList.add('visible');
      button.classList.add('open');
      button.innerHTML = closeIcon;
    } else {
      iframe.classList.remove('visible');
      button.classList.remove('open');
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
    if (!event.origin.includes('indra.ialksng.me') && !event.origin.includes('localhost') && !event.origin.includes('gurukul.ialksng.me')) return;

    const { type, payload } = event.data;

    if (type === 'OPEN_INDRA_WIDGET') {
      if (!isOpen) {
        button.click();
      }
    }

    if (type === 'PREFILL_INDRA') {
      iframe.contentWindow.postMessage({ type: 'PREFILL_MSG', payload }, '*');
    }

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

    if (type === 'SET_WIDGET_SIZE') {
        iframe.style.width = payload.width || '380px';
        iframe.style.height = payload.height || '600px';
    }
  });
})();
// public/content.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_LIVE_CONTEXT') {
        const elements = document.querySelectorAll('button, a, input, [role="button"]');
        const liveMap = [];
        let idCounter = 0;

        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= window.innerHeight) {
                const indraId = 'indra-ext-' + (idCounter++);
                el.setAttribute('data-indra-id', indraId);
                
                let text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || '').trim().substring(0, 50);
                if (!text && el.tagName === 'A') text = el.href;

                if (text) {
                    liveMap.push({ type: el.tagName.toLowerCase(), text: text, selector: `[data-indra-id="${indraId}"]` });
                }
            }
        });
        
        sendResponse({ url: window.location.href, title: document.title, map: liveMap });
        return true; // CRITICAL: Tells Chrome we responded
    }

    if (request.type === 'EXECUTE_ACTION') {
        const { action, selector, value } = request.payload;
        const element = document.querySelector(selector);
        
        if (element) {
            element.style.outline = "3px solid #9333ea";
            setTimeout(() => {
                if (action === 'click') element.click();
                if (action === 'fill') {
                    element.value = value;
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }
                element.style.outline = "";
                sendResponse({ success: true });
            }, 500); 
            return true; // CRITICAL: Tells Chrome to wait
        } else {
            sendResponse({ success: false });
            return true;
        }
    }
});
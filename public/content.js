// public/content.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. GET THE LIVE CONTEXT
    if (request.type === 'GET_LIVE_CONTEXT') {
        // Broadened selectors to catch modern web apps (React/Vue)
        const elements = document.querySelectorAll('button, a, input, textarea, select, [role="button"], [role="link"], [tabindex="0"]');
        const liveMap = [];
        let idCounter = 0;

        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            // Only grab elements that are actually visible on the screen
            if (rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.bottom <= window.innerHeight) {
                const indraId = 'indra-ext-' + (idCounter++);
                el.setAttribute('data-indra-id', indraId);
                
                let text = (el.innerText || el.value || el.placeholder || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().substring(0, 60);
                if (!text && el.tagName === 'A') text = el.href;

                if (text) {
                    liveMap.push({ 
                        type: el.tagName.toLowerCase(), 
                        text: text.replace(/\n/g, ' '), 
                        selector: `[data-indra-id="${indraId}"]` 
                    });
                }
            }
        });
        
        try {
            sendResponse({ 
                url: window.location.href, 
                title: document.title, 
                map: liveMap 
            });
        } catch (e) {
            // Ignore if channel is already closed
        }
        return true; 
    }

    // 2. EXECUTE ACTIONS
    if (request.type === 'EXECUTE_ACTION') {
        const { action, selector, value } = request.payload;
        
        if (action === 'scroll') {
            window.scrollBy({ top: value || window.innerHeight / 2, behavior: 'smooth' });
            try { sendResponse({ success: true, message: "Scrolled successfully" }); } catch (e) {}
            return true;
        }

        const element = document.querySelector(selector);
        
        if (element) {
            // Visual feedback
            const originalOutline = element.style.outline;
            element.style.outline = "4px solid #f59e0b"; // Amber color to match UI
            element.style.boxShadow = "0 0 15px #f59e0b";
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            setTimeout(() => {
                try {
                    if (action === 'click') {
                        element.click();
                    } else if (action === 'fill') {
                        element.value = value;
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    element.style.outline = originalOutline;
                    element.style.boxShadow = "none";
                    try { sendResponse({ success: true }); } catch (e) {}
                } catch (err) {
                    try { sendResponse({ success: false, error: err.message }); } catch (e) {}
                }
            }, 600); 
            return true; 
        } else {
            try { sendResponse({ success: false, error: "Element not found on screen" }); } catch (e) {}
            return true;
        }
    }
});
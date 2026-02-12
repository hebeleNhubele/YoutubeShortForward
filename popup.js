// Handle reset button click
document.getElementById('resetBtn').addEventListener('click', () => {
    // Helper to send message
    const sendMessageToTabs = (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: 'resetButtonPosition' }, (response) => {
                // Check for errors (e.g., content script not ready)
                const err = chrome.runtime.lastError;
            });
        });
    };

    // Try to find all YouTube tabs first
    chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
        if (tabs.length > 0) {
            sendMessageToTabs(tabs);
        } else {
            // Fallback: Try the active tab if URL matching failed
            chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
                sendMessageToTabs(activeTabs);
            });
        }
    });
    
    // Show confirmation and close popup
    const btn = document.getElementById('resetBtn');
    const originalText = btn.textContent;
    btn.textContent = '✓ Reset!';
    btn.style.background = 'linear-gradient(90deg, #4caf50 0%, #45a049 100%)';
    
    setTimeout(() => {
        window.close();
    }, 800);
});

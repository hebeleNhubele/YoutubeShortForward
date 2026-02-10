// Handle reset button click
document.getElementById('resetBtn').addEventListener('click', () => {
    // Send message to content script on all YouTube tabs
    chrome.tabs.query({ url: '*://*.youtube.com/*' }, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: 'resetButtonPosition' }, () => {
                // Ignore errors if content script isn't loaded yet
                chrome.runtime.lastError;
            });
        });
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

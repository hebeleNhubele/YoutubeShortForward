document.addEventListener('DOMContentLoaded', function() {
    const resetBtn = document.getElementById('resetPosition');
    const status = document.getElementById('status');
    
    function showStatus(message, type = 'success') {
        status.textContent = message;
        status.className = `status show ${type}`;
        setTimeout(() => {
            status.classList.remove('show');
        }, 2000);
    }
    
    resetBtn.addEventListener('click', function() {
        console.log('Reset button clicked');
        
        showStatus('Resetting position...');
        
        // Direct approach: just move the button to default position
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            console.log('Active tabs found:', tabs);
            
            if (tabs && tabs[0]) {
                console.log('Current tab URL:', tabs[0].url);
                console.log('Tab ID:', tabs[0].id);
                
                // More flexible YouTube detection
                const isYouTube = tabs[0].url && (
                    tabs[0].url.includes('youtube.com') || 
                    tabs[0].url.includes('youtu.be') ||
                    tabs[0].url.includes('www.youtube.com') ||
                    tabs[0].url.includes('m.youtube.com')
                );
                
                console.log('Is YouTube:', isYouTube);
                
                if (isYouTube) {
                    console.log('Executing script on YouTube tab');
                    
                    chrome.scripting.executeScript({
                        target: { tabId: tabs[0].id },
                        func: () => {
                            console.log('Script executing - current URL:', window.location.href);
                            console.log('Current pathname:', window.location.pathname);
                            
                            // Find the button
                            const button = document.getElementById('yt-shorts-auto-scroll-btn');
                            console.log('Button found:', !!button);
                            
                            // Check if we're on any YouTube page (not just shorts)
                            if (button) {
                                console.log('Button exists, moving to default position');
                                
                                // Clear stored position first to avoid conflicts
                                localStorage.removeItem('yt-shorts-auto-scroll-btn-pos');
                                if (typeof chrome !== 'undefined' && chrome.storage) {
                                    chrome.storage.local.remove('yt-shorts-auto-scroll-btn-pos');
                                }
                                
                                // Find the like button for default positioning
                                const likeBtn = document.querySelector('ytd-reel-video-renderer [aria-label][aria-pressed]');
                                console.log('Like button found:', !!likeBtn);
                                
                                let newX, newY;
                                
                                if (likeBtn) {
                                    // Position next to like button (default position)
                                    const rect = likeBtn.getBoundingClientRect();
                                    const margin = 8;
                                    newX = rect.right + margin;
                                    newY = rect.top - button.offsetHeight/2 + rect.height/2;
                                } else {
                                    // Fallback: move to a standard position
                                    newX = 20;
                                    newY = 100;
                                }
                                
                                // Set position with proper CSS
                                button.style.position = 'fixed';
                                button.style.left = newX + 'px';
                                button.style.top = newY + 'px';
                                button.style.zIndex = '9999999';
                                
                                console.log('Button moved to position:', newX, newY);
                                
                                // Force a small delay to ensure position is set
                                setTimeout(() => {
                                    button.style.left = newX + 'px';
                                    button.style.top = newY + 'px';
                                }, 10);
                                
                                return 'Button moved successfully to ' + newX + ', ' + newY;
                            } else {
                                return 'Button not found - make sure you are on a YouTube Shorts page';
                            }
                        }
                    }).then((results) => {
                        console.log('Script execution result:', results);
                        if (results && results[0] && results[0].result) {
                            if (results[0].result.includes('successfully')) {
                                showStatus('Position cleared! Refresh the page.');
                            } else {
                                showStatus(results[0].result, 'error');
                            }
                        } else {
                            showStatus('Reset completed');
                        }
                    }).catch((error) => {
                        console.log('Script injection failed:', error);
                        showStatus('Reset failed: ' + error.message, 'error');
                    });
                } else {
                    console.log('Not on YouTube - URL:', tabs[0].url);
                    showStatus('Please open YouTube first', 'error');
                }
            } else {
                console.log('No active tab found');
                showStatus('No active tab found', 'error');
            }
        });
    });
});
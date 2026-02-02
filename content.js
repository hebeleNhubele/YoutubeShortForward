// ==UserScript===
// @name         YouTube Shorts Auto-Scroller (Enhanced)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Auto-scrolls YouTube Shorts with background support and enhanced drag handling
// @author       Abdullah Anbar
// ==/UserScript==
(function () {
    const BUTTON_ID = 'yt-shorts-auto-scroll-btn';
    let autoScroll = false;
    let currentVideo = null;
    let lastVideoSrc = null;
    let videoListenerAttached = false;
    let observer = null;
    let url = location.href;
    
    // Background operation
    let isPageVisible = !document.hidden;
    let backgroundCheckInterval = null;
    let dragStartPos = { x: 0, y: 0 };
    let isDragging = false;
    let dragThreshold = 5; // pixels

    // --- Helper: Check if on Shorts page ---
    function isShortsPage() {
        return window.location.pathname.startsWith('/shorts/');
    }

    // --- Helper: Get Shorts Video Container ---
    function getShortsVideoContainer() {
        return document.querySelector('ytd-reel-video-renderer');
    }

    // --- Helper: Get Shorts Like Button ---
    function getShortsLikeButton() {
        return document.querySelector('ytd-reel-video-renderer [aria-label][aria-pressed]');
    }

    // --- Helper: Save/Load Button Position (using chrome.storage for persistence) ---
    function saveButtonPosition(x, y) {
        const pos = { x, y };
        console.log('Saving button position:', pos);
        // Use chrome.storage if available, fallback to localStorage
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ 'yt-shorts-auto-scroll-btn-pos': pos });
        }
        localStorage.setItem('yt-shorts-auto-scroll-btn-pos', JSON.stringify(pos));
    }
    
    function loadButtonPosition(callback) {
        // Try chrome.storage first, fallback to localStorage
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get('yt-shorts-auto-scroll-btn-pos', function(result) {
                const pos = result['yt-shorts-auto-scroll-btn-pos'];
                if (pos && callback) {
                    callback(pos);
                } else {
                    // Fallback to localStorage
                    try {
                        const localPos = JSON.parse(localStorage.getItem('yt-shorts-auto-scroll-btn-pos'));
                        callback(localPos);
                    } catch {
                        callback(null);
                    }
                }
            });
        } else {
            try {
                const pos = JSON.parse(localStorage.getItem('yt-shorts-auto-scroll-btn-pos'));
                callback(pos);
            } catch {
                callback(null);
            }
        }
    }

    function clearButtonPosition() {
        console.log('Clearing all button position storage');
        // Clear both storage methods
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.remove('yt-shorts-auto-scroll-btn-pos');
        }
        localStorage.removeItem('yt-shorts-auto-scroll-btn-pos');
    }

    // --- Helper: Position Button Relative to Shorts Video ---
    function positionButton(button, pos) {
        const likeBtn = getShortsLikeButton();
        const margin = 8;
        
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            button.style.position = 'fixed';
            button.style.left = pos.x + 'px';
            button.style.top = pos.y + 'px';
        } else if (likeBtn) {
            // Default position next to Like button
            setTimeout(() => {
                const rect = likeBtn.getBoundingClientRect();
                console.log('Like button rect:', rect);
                button.style.position = 'fixed';
                button.style.left = (rect.right + margin) + 'px';
                button.style.top = (rect.top - button.offsetHeight/2 + rect.height/2) + 'px';
            }, 100);
        } else {
            // Fallback: bottom right of Shorts video
            const container = getShortsVideoContainer();
            if (container) {
                const rect = container.getBoundingClientRect();
                const fallbackMargin = 16;
                setTimeout(() => {
                    button.style.position = 'fixed';
                    button.style.left = (rect.right - button.offsetWidth - fallbackMargin) + 'px';
                    button.style.top = (rect.bottom - button.offsetHeight - fallbackMargin) + 'px';
                    console.log('Button positioned at fallback:', button.style.left, button.style.top);
                }, 100);
            } else {
                console.log('No container found, using absolute fallback');
                button.style.position = 'fixed';
                button.style.left = '20px';
                button.style.top = '100px';
            }
        }
    }

    // --- Helper: Make Button Draggable (with click prevention during drag) ---
    function makeButtonDraggable(button) {
        let isMouseDown = false;
        let offsetX = 0, offsetY = 0;
        let hasMoved = false;
        let startX = 0, startY = 0;
        
        button.addEventListener('mousedown', function (e) {
            isMouseDown = true;
            isDragging = false;
            hasMoved = false;
            
            // Get current button position
            const rect = button.getBoundingClientRect();
            startX = rect.left;
            startY = rect.top;
            
            // Calculate offset from mouse to button's top-left corner
            offsetX = e.clientX - startX;
            offsetY = e.clientY - startY;
            
            dragStartPos = { x: e.clientX, y: e.clientY };
            
            document.body.style.userSelect = 'none';
            e.preventDefault();
            
            console.log('Drag start - Button at:', startX, startY, 'Mouse at:', e.clientX, e.clientY, 'Offset:', offsetX, offsetY);
        });
        
        document.addEventListener('mousemove', function (e) {
            if (!isMouseDown) return;
            
            const deltaX = Math.abs(e.clientX - dragStartPos.x);
            const deltaY = Math.abs(e.clientY - dragStartPos.y);
            
            // Check if we've moved beyond threshold
            if (!hasMoved && (deltaX > dragThreshold || deltaY > dragThreshold)) {
                hasMoved = true;
                isDragging = true;
                console.log('Started dragging');
            }
            
            if (hasMoved) {
                // Calculate new position based on mouse position and offset
                let x = e.clientX - offsetX;
                let y = e.clientY - offsetY;
                
                // Keep button within viewport
                x = Math.max(0, Math.min(x, window.innerWidth - button.offsetWidth));
                y = Math.max(0, Math.min(y, window.innerHeight - button.offsetHeight));
                
                // Apply position immediately
                button.style.position = 'fixed';
                button.style.left = x + 'px';
                button.style.top = y + 'px';
                
                console.log('Dragging to:', x, y);
            }
        });
        
        document.addEventListener('mouseup', function (e) {
            if (isMouseDown) {
                document.body.style.userSelect = '';
                
                console.log('Mouse up - hasMoved:', hasMoved);
                
                if (hasMoved) {
                    // Save the final position
                    const finalX = parseInt(button.style.left);
                    const finalY = parseInt(button.style.top);
                    console.log('Saving final position:', finalX, finalY);
                    saveButtonPosition(finalX, finalY);
                    
                    // Prevent click event after drag
                    setTimeout(() => {
                        isDragging = false;
                    }, 100);
                } else {
                    // It was just a click, allow toggle
                    isDragging = false;
                    toggleAutoScroll();
                }
                
                isMouseDown = false;
                hasMoved = false;
            }
        });
        
        // Prevent click event if we dragged
        button.addEventListener('click', function(e) {
            if (isDragging || hasMoved) {
                console.log('Preventing click due to drag');
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
    }

    // --- Helper: Reposition Button on Resize/Navigation ---
    function repositionButton() {
        const button = document.getElementById(BUTTON_ID);
        if (!button) return;
        
        loadButtonPosition((pos) => {
            positionButton(button, pos);
        });
    }

    // --- Helper: Observe Shorts Video Container for changes ---
    function observeShortsContainerForButton() {
        const container = getShortsVideoContainer();
        if (!container) return;
        const observer = new MutationObserver(() => {
            repositionButton();
        });
        observer.observe(container, { childList: true, subtree: true });
    }

    // --- Helper: Create or Remove Button ---
    function injectButton() {
        if (document.getElementById(BUTTON_ID)) return;
        
        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.innerHTML = `
            <span id="yt-shorts-auto-scroll-icon" style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </span>
        `;
        
        // Modern styling
        button.style.position = 'fixed';
        button.style.width = '56px';  // Bigger
        button.style.height = '56px'; // Bigger
        button.style.padding = '0';
        button.style.background = 'rgba(239, 68, 68, 0.8)'; // Red instead of black
        button.style.backdropFilter = 'blur(10px)';
        button.style.color = '#fff';
        button.style.border = '1px solid rgba(239, 68, 68, 0.4)'; // Red border
        button.style.borderRadius = '50%';
        button.style.cursor = 'pointer';
        button.style.fontWeight = '500';
        button.style.fontSize = '14px';
        button.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)';
        button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.zIndex = '9999999';
        button.style.userSelect = 'none';
        button.style.outline = 'none';
        
        // Position button
        loadButtonPosition((pos) => {
            positionButton(button, pos);
        });
        
        // Modern hover effects
        button.onmouseenter = () => {
            if (!isDragging) {
                button.style.transform = 'scale(1.1)';
                button.style.background = autoScroll ? 
                    'rgba(34, 197, 94, 0.9)' : 
                    'rgba(239, 68, 68, 0.9)'; // Red instead of black
                button.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3)';
                button.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }
        };
        button.onmouseleave = () => {
            if (!isDragging) {
                button.style.transform = 'scale(1)';
                button.style.background = autoScroll ? 
                    'rgba(34, 197, 94, 0.8)' : 
                    'rgba(239, 68, 68, 0.8)'; // Red instead of black
                button.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)';
                button.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }
        };
        
        document.body.appendChild(button);
        makeButtonDraggable(button);
        observeShortsContainerForButton();
        window.addEventListener('resize', repositionButton);
        
        // Listen for reset position event from popup
        document.addEventListener('resetButtonPosition', () => {
            loadButtonPosition((pos) => {
                positionButton(button, null); // Force default position
            });
        });
    }

    function removeButton() {
        const btn = document.getElementById(BUTTON_ID);
        if (btn) btn.remove();
    }

    // --- Toggle Auto-Scroll ---
    function toggleAutoScroll() {
        autoScroll = !autoScroll;
        updateButtonState();
        if (autoScroll) {
            attachVideoListener();
            startBackgroundOptimization();
        } else {
            detachVideoListener();
            stopBackgroundOptimization();
        }
    }

    function updateButtonState() {
        const button = document.getElementById(BUTTON_ID);
        const iconSpan = button?.querySelector('#yt-shorts-auto-scroll-icon');
        if (!button || !iconSpan) return;
        
        if (autoScroll) {
            // Pause icon - modern design
            iconSpan.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
            `;
            button.style.background = 'rgba(34, 197, 94, 0.8)'; // Green when active
            button.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        } else {
            // Play icon - modern design
            iconSpan.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
            button.style.background = 'rgba(239, 68, 68, 0.8)'; // Red instead of black
            button.style.borderColor = 'rgba(239, 68, 68, 0.4)'; // Red border
        }
    }

    // --- Background Operation Optimization ---
    function startBackgroundOptimization() {
        console.log('Starting background optimization');
        
        // Monitor page visibility
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Set up more aggressive interval for background checking
        if (!backgroundCheckInterval) {
            backgroundCheckInterval = setInterval(() => {
                if (!isPageVisible && autoScroll && isShortsPage()) {
                    // More frequent checking when in background
                    const video = document.querySelector('ytd-reel-video-renderer video');
                    if (video && video.duration > 0 && video.currentTime > 0) {
                        const timeLeft = video.duration - video.currentTime;
                        console.log('Background check - time left:', timeLeft);
                        
                        if (timeLeft < 1.0 && !video.paused && !video.ended) {
                            console.log('Background scroll triggered');
                            scrollToNext();
                        }
                    }
                }
            }, 1000); // 1 second interval (browser limit for background tabs)
        }
        
        // Try to keep tab somewhat active (limited effectiveness)
        if (!isPageVisible) {
            // Send periodic keep-alive signals
            const keepAlive = setInterval(() => {
                if (!autoScroll) {
                    clearInterval(keepAlive);
                    return;
                }
                // Minimal DOM interaction to prevent full throttling
                document.title = document.title;
            }, 5000);
        }
    }
    
    function stopBackgroundOptimization() {
        console.log('Stopping background optimization');
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (backgroundCheckInterval) {
            clearInterval(backgroundCheckInterval);
            backgroundCheckInterval = null;
        }
    }
    
    function handleVisibilityChange() {
        isPageVisible = !document.hidden;
        console.log('Visibility changed - visible:', isPageVisible);
        
        if (isPageVisible && autoScroll) {
            // Re-attach listener when page becomes visible
            console.log('Page visible again, re-attaching video listener');
            attachVideoListener();
        } else if (!isPageVisible && autoScroll) {
            console.log('Page hidden, relying on background checks');
        }
    }

    // --- Find Next Button Robustly ---
    function findNextButton() {
        const selectors = [
            'button[aria-label*="Next"]',
            'button[aria-label*="Siguiente"]',
            'button[aria-label*="Próximo"]',
            'button[aria-label*="Sonraki"]',
            'button[aria-label*="Следующее"]',
            'button[aria-label*="Suivant"]',
            'button[aria-label*="Volgende"]',
            'button[aria-label*="Nächste"]',
            'button[aria-label*="次へ"]',
            'button[aria-label*="다음"]',
            'button[aria-label*="下一個"]',
            'button[aria-label*="下一步"]',
        ];
        for (let selector of selectors) {
            const btn = document.querySelector(selector);
            if (btn) return btn;
        }
        return null;
    }

    // --- Scroll to Next Short ---
    function scrollToNext() {
        const nextButton = findNextButton();
        if (nextButton) {
            nextButton.click();
        } else {
            // Fallback to keyboard navigation
            const video = document.querySelector('video');
            if (video) video.focus();
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'j',
                keyCode: 74,
                code: 'KeyJ',
                which: 74,
                bubbles: true,
                cancelable: true,
                composed: true
            }));
        }
    }

    // --- Video Progress Handler ---
    function handleTimeUpdate(event) {
        const video = event.target;
        if (!video || !autoScroll) return;
        
        if (video.duration > 0 &&
            video.currentTime > 0 &&
            (video.duration - video.currentTime) < 0.5 &&
            !video.paused && !video.ended) {
            scrollToNext();
            video.removeEventListener('timeupdate', handleTimeUpdate);
            videoListenerAttached = false;
            setTimeout(attachVideoListener, 1000);
        }
    }

    // --- Attach/Detach Video Listener ---
    function attachVideoListener() {
        if (!autoScroll || !isShortsPage()) return;
        
        const shortsVideo = document.querySelector('ytd-reel-video-renderer video');
        if (!shortsVideo) return;
        if (videoListenerAttached && lastVideoSrc === shortsVideo.src) return;
        
        detachVideoListener();
        shortsVideo.addEventListener('timeupdate', handleTimeUpdate);
        videoListenerAttached = true;
        lastVideoSrc = shortsVideo.src;
        currentVideo = shortsVideo;
    }

    function detachVideoListener() {
        if (currentVideo) {
            currentVideo.removeEventListener('timeupdate', handleTimeUpdate);
        }
        videoListenerAttached = false;
        lastVideoSrc = null;
        currentVideo = null;
    }

    // --- Watch for SPA Navigation ---
    function onUrlChange() {
        if (isShortsPage()) {
            injectButton();
            updateButtonState();
            if (autoScroll) {
                attachVideoListener();
                startBackgroundOptimization();
            }
        } else {
            removeButton();
            detachVideoListener();
            stopBackgroundOptimization();
            autoScroll = false;
        }
    }

    // --- MutationObserver for URL and DOM changes ---
    function observeUrlAndDom() {
        let lastPath = location.pathname;
        observer = new MutationObserver(() => {
            if (location.pathname !== lastPath) {
                lastPath = location.pathname;
                onUrlChange();
            }
            if (isShortsPage() && autoScroll) {
                attachVideoListener();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- Initial Run ---
    onUrlChange();
    observeUrlAndDom();

    // --- Message handling for popup communication ---
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Content script received message:', message);
            
            if (message.action === 'resetButtonPosition') {
                const button = document.getElementById(BUTTON_ID);
                const isOnShorts = isShortsPage();
                
                console.log('Reset request - Button found:', !!button, 'On shorts:', isOnShorts);
                
                if (button && isOnShorts) {
                    // Clear stored position completely
                    clearButtonPosition();
                    console.log('All storage cleared');
                    
                    // Force immediate reposition to default
                    console.log('Forcing button reposition');
                    positionButton(button, null);
                    
                    sendResponse({success: true, message: 'Button reset successfully'});
                } else {
                    const reason = !button ? 'Button not found' : 'Not on Shorts page';
                    console.log('Reset failed:', reason);
                    sendResponse({success: false, reason: reason});
                }
                return true;
            }
        });
    }
    
    // Also listen for custom events (fallback)
    document.addEventListener('resetButtonPosition', () => {
        console.log('Custom reset event received');
        const button = document.getElementById(BUTTON_ID);
        if (button && isShortsPage()) {
            localStorage.removeItem('yt-shorts-auto-scroll-btn-pos');
            positionButton(button, null);
            console.log('Button reset via custom event');
        }
    });

    console.log('YouTube Shorts Auto-Scroller (Enhanced) v1.3 Loaded');
})();

// ==UserScript===
// @name         YouTube Shorts Auto-Scroller (SPA-Aware)
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Auto-scrolls YouTube Shorts, robust to SPA navigation and video element reuse. Prevents play/pause on drag.
// @author       Abdullah Anbar
// ==/UserScript==
(function () {
    const BUTTON_ID = 'yt-shorts-auto-scroll-btn';
    let autoScroll = false;
    let currentVideo = null;
    let lastVideoSrc = null;
    let videoListenerAttached = false;
    let isDragging = false;
    let observer = null;
    let lastTime = 0; // Track time to detect loops
    let url = location.href;

    // --- Helper: Check if on Shorts page ---
    function isShortsPage() {
        return window.location.pathname.startsWith('/shorts/');
    }

    // --- Helper: Get Shorts Video Container ---
    function getShortsVideoContainer() {
        const renderers = document.querySelectorAll('ytd-reel-video-renderer');
        const viewHeight = window.innerHeight;
        const viewCenter = viewHeight / 2;
        
        let bestRenderer = null;
        let minDistance = Infinity;

        for (const renderer of renderers) {
            // Must contain a video to be valid
            if (!renderer.querySelector('video')) continue;

            const rect = renderer.getBoundingClientRect();
            if (rect.height === 0) continue; // Ignore hidden elements
            const center = rect.top + (rect.height / 2);
            const distance = Math.abs(center - viewCenter);

            if (distance < minDistance) {
                minDistance = distance;
                bestRenderer = renderer;
            }
        }
        
        return bestRenderer || document.querySelector('ytd-reel-video-renderer');
    }

    // --- Helper: Save/Load Button Position ---
    function saveButtonPosition(x, y) {
        localStorage.setItem('yt-shorts-auto-scroll-btn-pos', JSON.stringify({ x, y }));
    }
    function loadButtonPosition() {
        try {
            return JSON.parse(localStorage.getItem('yt-shorts-auto-scroll-btn-pos'));
        } catch {
            return null;
        }
    }

    // --- Helper: Position Button Relative to Shorts Video ---
    function positionButton(button, pos) {
        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        const buttonWidth = button.offsetWidth;
        const buttonHeight = button.offsetHeight;

        // Check if the saved position is valid and within the viewport
        let useSavedPos = pos &&
                          typeof pos.x === 'number' &&
                          typeof pos.y === 'number' &&
                          pos.x > 0 && pos.x < (viewWidth - buttonWidth) &&
                          pos.y > 0 && pos.y < (viewHeight - buttonHeight);

        if (useSavedPos) {
            button.style.position = 'fixed';
            button.style.left = pos.x + 'px';
            button.style.top = pos.y + 'px';
        } else {
            // Default: Top Left of the Shorts player (Safer & Consistent)
            const container = getShortsVideoContainer();
            if (container) {
                const rect = container.getBoundingClientRect();
                const margin = 20;
                button.style.position = 'fixed';
                button.style.left = (rect.left + margin) + 'px';
                button.style.top = (rect.top + margin) + 'px';
            }
        }
    }

    // --- Helper: Make Button Draggable ---
    function makeButtonDraggable(button) {
        let offsetX = 0, offsetY = 0;
        let startX = 0, startY = 0;
        let hasDragged = false; // This will be reset on each mousedown
        const DRAG_THRESHOLD_PX = 5; // Must move this many pixels before it counts as a drag

        button.addEventListener('mousedown', function (e) {
            isDragging = true;
            hasDragged = false; // Reset the drag state
            offsetX = e.clientX - button.getBoundingClientRect().left;
            offsetY = e.clientY - button.getBoundingClientRect().top;
            startX = e.clientX;
            startY = e.clientY;
            document.body.style.userSelect = 'none';

            // Add listeners to the document to handle dragging anywhere on the page
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true }); // Use 'once' to auto-remove
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            // Only count as a drag if the mouse moved beyond the threshold
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!hasDragged && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD_PX) return;
            hasDragged = true; // Mouse moved far enough — it's a real drag
            
            const buttonWidth = button.offsetWidth;
            const buttonHeight = button.offsetHeight;
            const viewWidth = window.innerWidth;
            const viewHeight = window.innerHeight;

            // Calculate proposed new position
            let x = e.clientX - offsetX;
            let y = e.clientY - offsetY;

            // Clamp the position to be within the viewport
            x = Math.max(0, Math.min(x, viewWidth - buttonWidth));
            y = Math.max(0, Math.min(y, viewHeight - buttonHeight));

            button.style.left = x + 'px';
            button.style.top = y + 'px';
        }

        function onMouseUp(e) {
            if (!isDragging) return;
            isDragging = false;
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove); // Clean up listener

            if (hasDragged) {
                // Only save if we actually dragged
                saveButtonPosition(parseInt(button.style.left), parseInt(button.style.top));
            }
        }

        // Add a capture-phase click listener to intercept clicks after a drag.
        button.addEventListener('click', function(e) {
            if (hasDragged) {
                // If a drag just happened, stop this click from triggering the button's action.
                e.stopImmediatePropagation();
                hasDragged = false; // Reset so the very next click works cleanly
            }
        }, true); // <-- The 'true' is important. It puts this listener in the capture phase.
    }

    // --- Helper: Reposition Button on Resize/Navigation ---
    function repositionButton() {
        if (isDragging) return; // Do not reposition while dragging
        const button = document.getElementById(BUTTON_ID);
        if (!button) return;
        const pos = loadButtonPosition();
        positionButton(button, pos);
    }

    // --- Helper: Create or Remove Button ---
    function injectButton() {
        if (document.getElementById(BUTTON_ID)) return; // Already present
        const button = document.createElement('button');
        button.id = BUTTON_ID;

        // Clear, modern design with icon and label
        button.style.position = 'fixed';
        button.style.height = '36px';
        button.style.padding = '0 16px';
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.borderRadius = '18px'; // Pill shape
        button.style.cursor = 'pointer';
        button.style.fontWeight = 'bold';
        button.style.fontSize = '14px';
        button.style.fontFamily = '"Roboto", "Arial", sans-serif';
        button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.25)';
        button.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.gap = '8px';
        button.style.zIndex = '9999999';

        // Position relative to Shorts video
        const pos = loadButtonPosition();
        positionButton(button, pos);

        // Hover effect
        button.onmouseenter = () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        };
        button.onmouseleave = () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.25)';
        };
        
        makeButtonDraggable(button);
        button.addEventListener('click', toggleAutoScroll);
        
        document.body.appendChild(button);
        updateButtonState(); // Set initial state
        
        window.addEventListener('resize', repositionButton);
    }

    function removeButton() {
        const btn = document.getElementById(BUTTON_ID);
        if (btn) btn.remove();
        window.removeEventListener('resize', repositionButton);
        isDragging = false;
    }

    // --- Toggle Auto-Scroll ---
    function toggleAutoScroll() {
        autoScroll = !autoScroll;
        updateButtonState();
        if (autoScroll) {
            attachVideoListener();
        } else {
            detachVideoListener();
        }
    }

    function updateButtonState() {
        const button = document.getElementById(BUTTON_ID);
        if (!button) return;

        if (autoScroll) {
            // Active state (Stop)
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
                <span>Stop</span>
            `;
            button.style.backgroundColor = '#007BFF'; // Vibrant blue
        } else {
            // Inactive state (Start)
            button.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"></path></svg>
                <span>Start</span>
            `;
            button.style.backgroundColor = '#673AB7'; // Deep purple
        }
    }

    // --- Find Next Button Robustly ---
    function findNextButton() {
        // Scope search to the active Shorts container
        const container = getShortsVideoContainer();
        if (!container) return null;

        // Try different selectors that YouTube might use
        const selectors = [
            'button[aria-label*="Next"]',
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
            const btn = container.querySelector(selector);
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
            // Fallback: ArrowDown is more reliable for "scrolling" the feed than 'J'
            // Dispatch to document.body to ensure it's caught globally
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                keyCode: 40,
                code: 'ArrowDown',
                which: 40,
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
        
        const currentTime = video.currentTime;
        const duration = video.duration;

        // 1. Standard End Detection (within 0.4s of end)
        const isNearEnd = duration > 0 && (duration - currentTime) < 0.4;
        
        // 2. Loop Detection: Time dropped significantly AND we were previously near the end
        const isLooping = currentTime < lastTime && lastTime > (duration * 0.8);

        if ((isNearEnd || isLooping) && !video.paused) {
            scrollToNext();
            // Prevent multiple triggers for the same video
            video.removeEventListener('timeupdate', handleTimeUpdate);
            videoListenerAttached = false;
            lastTime = 0;
            setTimeout(attachVideoListener, 1000);
        } else {
            lastTime = currentTime;
        }
    }

    // --- Attach/Detach Video Listener ---
    function attachVideoListener() {
        if (!autoScroll || !isShortsPage()) return;
        // Select the video inside the Shorts player, not the miniplayer
        const container = getShortsVideoContainer();
        const shortsVideo = container ? container.querySelector('video') : null;
        if (!shortsVideo) return;
        if (videoListenerAttached && lastVideoSrc === shortsVideo.src) return;
        detachVideoListener();
        shortsVideo.addEventListener('timeupdate', handleTimeUpdate);
        videoListenerAttached = true;
        lastTime = 0;
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

    // --- Performance-Optimized Observer Logic ---
    let shortsObserver = null;
    let titleObserver = null;
    let debounceTimer = null;

    // Debounce utility to prevent rapid-fire function calls
    function debounce(func, delay) {
        return function(...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    const debouncedRepositionButton = debounce(repositionButton, 100);

    function handlePageChange() {
        // Disconnect any existing shorts observer
        if (shortsObserver) {
            shortsObserver.disconnect();
            shortsObserver = null;
        }
        clearTimeout(debounceTimer);

        if (isShortsPage()) {
            injectButton(); // This will also call the initial positionButton

            // Use a function to wait for the shorts container to be available
            const setupShortsObserver = () => {
                // Target the specific items container to avoid subtree observation on the whole player
                const shortsContainer = document.querySelector('ytd-shorts #items') || document.querySelector('ytd-shorts');
                if (shortsContainer) {
                    shortsObserver = new MutationObserver((mutations) => {
                        // Performance: Only react if nodes are actually added/removed
                        const hasRelevantChanges = mutations.some(m => m.type === 'childList');
                        if (!hasRelevantChanges) return;

                        if (autoScroll) {
                            attachVideoListener();
                        }
                        // Debounce repositioning to handle rapid DOM changes gracefully
                        debouncedRepositionButton();
                    });
                    
                    // If we found the specific items container, we don't need subtree
                    const useSubtree = shortsContainer.id !== 'items';
                    shortsObserver.observe(shortsContainer, { childList: true, subtree: useSubtree });
                } else {
                    // Retry if the container isn't there yet
                    if (isShortsPage()) {
                        setTimeout(setupShortsObserver, 500);
                    }
                }
            };
            setupShortsObserver();

             if (autoScroll) {
                // Initial check
                setTimeout(attachVideoListener, 1000);
            }
        } else {
            removeButton();
            detachVideoListener();
            if (autoScroll) {
                autoScroll = false;
            }
        }
    }

    // --- Message Listener for Popup ---
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'resetButtonPosition') {
            localStorage.removeItem('yt-shorts-auto-scroll-btn-pos');
            repositionButton();
            sendResponse({ status: 'success' });
        }
    });

    function initialize() {
        // Main observer for URL changes (lightweight)
        titleObserver = new MutationObserver(() => {
            if (url !== location.href) {
                url = location.href;
                handlePageChange();
            }
        });

        // Start observing the title for URL changes
        const titleElement = document.querySelector('head > title');
        if (titleElement) {
            titleObserver.observe(titleElement, { childList: true });
        }
        
        // Initial check
        handlePageChange();
    }

    initialize();

})();

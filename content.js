// ==UserScript===
// @name         YouTube Shorts Auto-Scroller (SPA-Aware)
// @namespace    http://tampermonkey.net/
// @version      1.2
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
    let url = location.href;

    // --- Helper: Check if on Shorts page ---
    function isShortsPage() {
        return window.location.pathname.startsWith('/shorts/');
    }

    // --- Helper: Get Shorts Video Container ---
    function getShortsVideoContainer() {
        // Try to find the main Shorts video container
        return document.querySelector('ytd-reel-video-renderer');
    }

    // --- Helper: Get Shorts Like Button ---
    function getShortsLikeButton() {
        // Try to find the Like button inside the Shorts player
        return document.querySelector('ytd-reel-video-renderer [aria-label][aria-pressed]');
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
        const likeBtn = getShortsLikeButton();
        const margin = 8;
        // If a saved position exists, use it
        if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
            button.style.position = 'fixed';
            button.style.left = pos.x + 'px';
            button.style.top = pos.y + 'px';
        } else if (likeBtn) {
            // Place next to the Like button by default
            setTimeout(() => {
                const rect = likeBtn.getBoundingClientRect();
                button.style.position = 'fixed';
                button.style.left = (rect.right + margin) + 'px';
                button.style.top = (rect.top - button.offsetHeight/2 + rect.height/2) + 'px';
            }, 0);
        }
        else {
            // Fallback: bottom right of Shorts video
            const container = getShortsVideoContainer();
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const fallbackMargin = 16;
            setTimeout(() => {
                button.style.position = 'fixed';
                button.style.left = (rect.right - button.offsetWidth - fallbackMargin) + 'px';
                button.style.top = (rect.bottom - button.offsetHeight - fallbackMargin) + 'px';
            }, 0);
        }
    }

    // --- Helper: Make Button Draggable ---
    function makeButtonDraggable(button) {
        let offsetX = 0, offsetY = 0;
        let hasDragged = false; // This will be reset on each mousedown

        button.addEventListener('mousedown', function (e) {
            isDragging = true;
            hasDragged = false; // Reset the drag state
            offsetX = e.clientX - button.getBoundingClientRect().left;
            offsetY = e.clientY - button.getBoundingClientRect().top;
            document.body.style.userSelect = 'none';

            // Add listeners to the document to handle dragging anywhere on the page
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true }); // Use 'once' to auto-remove
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            hasDragged = true; // If we're dragging and mouse moves, it's a drag
            let x = e.clientX - offsetX;
            let y = e.clientY - offsetY;
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
        if (document.getElementById(BUTTON_ID)) return; // Already present
        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.innerHTML = `
            <span id="yt-shorts-auto-scroll-icon" style="vertical-align:middle;display:inline-block;width:14px;height:14px;margin-right:4px;">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><polygon points="5,3 19,12 5,21"/></svg>
            </span>
            <span id="yt-shorts-auto-scroll-label" style="font-size:13px;">Start</span>
        `;
        // Smaller, round, less padding
        button.style.position = 'fixed';
        button.style.width = 'auto';
        button.style.height = '32px';
        button.style.padding = '4px 12px';
        button.style.background = 'linear-gradient(90deg, #ff512f 0%, #dd2476 100%)';
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.borderRadius = '18px';
        button.style.cursor = 'pointer';
        button.style.fontWeight = 'bold';
        button.style.fontSize = '13px';
        button.style.boxShadow = '0 2px 8px rgba(221,36,118,0.18)';
        button.style.transition = 'background 0.3s, transform 0.2s, box-shadow 0.2s';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.gap = '4px';
        button.style.zIndex = '9999999';
        // Position relative to Shorts video
        const pos = loadButtonPosition();
        positionButton(button, pos);
        // Hover effect
        button.onmouseenter = () => {
            button.style.background = 'linear-gradient(90deg, #dd2476 0%, #ff512f 100%)';
            button.style.transform = 'scale(1.07)';
            button.style.boxShadow = '0 4px 16px rgba(221,36,118,0.28)';
        };
        button.onmouseleave = () => {
            button.style.background = 'linear-gradient(90deg, #ff512f 0%, #dd2476 100%)';
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 2px 8px rgba(221,36,118,0.18)';
        };
        
        makeButtonDraggable(button);
        button.addEventListener('click', toggleAutoScroll);
        
        document.body.appendChild(button);
        
        observeShortsContainerForButton();
        window.addEventListener('resize', repositionButton);
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
        } else {
            detachVideoListener();
        }
    }

    function updateButtonState() {
        const button = document.getElementById(BUTTON_ID);
        const iconSpan = button?.querySelector('#yt-shorts-auto-scroll-icon');
        const labelSpan = button?.querySelector('#yt-shorts-auto-scroll-label');
        if (!button || !iconSpan || !labelSpan) return;
        if (autoScroll) {
            // Pause icon
            iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
            labelSpan.textContent = 'Stop Auto-Scroll';
            button.style.background = 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)';
        } else {
            // Play icon
            iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><polygon points="5,3 19,12 5,21"/></svg>`;
            labelSpan.textContent = 'Start Auto-Scroll';
            button.style.background = 'linear-gradient(90deg, #ff512f 0%, #dd2476 100%)';
        }
    }

    // --- Find Next Button Robustly ---
    function findNextButton() {
        // Try different selectors that YouTube might use
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
            // Prevent multiple triggers for the same video
            video.removeEventListener('timeupdate', handleTimeUpdate);
            videoListenerAttached = false;
            setTimeout(attachVideoListener, 1000);
        }
    }

    // --- Attach/Detach Video Listener ---
    function attachVideoListener() {
        if (!autoScroll || !isShortsPage()) return;
        // Select the video inside the Shorts player, not the miniplayer
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
            if (autoScroll) attachVideoListener();
        } else {
            removeButton();
            detachVideoListener();
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
            // If on Shorts, check for new video element
            if (isShortsPage() && autoScroll) {
                attachVideoListener();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- Initial Run ---
    onUrlChange();
    observeUrlAndDom();

    // For debugging
    console.log('YouTube Shorts Auto-Scroller (SPA-Aware) Loaded');
})();
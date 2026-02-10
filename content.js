(function () {
    'use strict';

    let autoScroll = false;
    let scrollButton = null;
    let videoElement = null;
    let lastPath = location.pathname;

    // --- Core Functions ---

    function isShortsPage() {
        return window.location.pathname.startsWith('/shorts/');
    }

    function scrollToNext() {
        // This clicks the "down arrow" button on the shorts player
        const nextButton = document.querySelector('#navigation-button-down button');
        if (nextButton) {
            nextButton.click();
        } else {
             // Fallback for different youtube layouts
            const fallbackButton = document.querySelector('button[aria-label*="Next"]');
            if(fallbackButton) fallbackButton.click();
        }
    }

    function handleVideoEnded() {
        // Only scroll if the tab is visible and auto-scroll is on.
        if (!document.hidden && autoScroll) {
            scrollToNext();
        }
    }

    // --- Video Observation ---

    function attachToVideo(video) {
        if (videoElement === video) return; // Already attached

        if (videoElement) {
            videoElement.removeEventListener('ended', handleVideoEnded);
        }

        video.addEventListener('ended', handleVideoEnded);
        videoElement = video;
    }

    function findAndAttachToVideo() {
        if (!isShortsPage() || !autoScroll) return;

        const video = document.querySelector('ytd-reel-video-renderer[is-active] video');
        if (video && video.src && videoElement?.src !== video.src) {
            attachToVideo(video);
        }
    }

    // --- UI Functions ---

    function updateButtonState() {
        if (!scrollButton) return;
        if (autoScroll) {
            scrollButton.textContent = 'Auto-Scroll: ON';
            scrollButton.style.backgroundColor = '#4CAF50'; // Green
            findAndAttachToVideo(); // Start looking for videos now
        } else {
            scrollButton.textContent = 'Auto-Scroll: OFF';
            scrollButton.style.backgroundColor = '#f44336'; // Red
            if(videoElement) {
                videoElement.removeEventListener('ended', handleVideoEnded);
                videoElement = null;
            }
        }
    }

    function toggleAutoScroll() {
        autoScroll = !autoScroll;
        updateButtonState();
    }

    function createOrUpdateButton() {
        if (!isShortsPage()) {
            if (scrollButton) {
                scrollButton.remove();
                scrollButton = null;
            }
            return;
        }

        if (!scrollButton) {
            const button = document.createElement('button');
            button.id = 'shorts-auto-scroll-button';
            button.style.position = 'fixed';
            button.style.bottom = '70px'; // Position above other elements
            button.style.right = '20px';
            button.style.zIndex = '9999';
            button.style.padding = '10px 15px';
            button.style.border = 'none';
            button.style.borderRadius = '5px';
            button.style.color = 'white';
            button.style.fontWeight = 'bold';
            button.style.cursor = 'pointer';
            button.style.transition = 'background-color 0.3s';
            button.addEventListener('click', toggleAutoScroll);
            document.body.appendChild(button);
            scrollButton = button;
        }
        updateButtonState();
    }

    // --- Page Observer ---

    function handlePageChanges() {
        // Handle URL changes for SPA navigation
        if (location.pathname !== lastPath) {
            lastPath = location.pathname;
            createOrUpdateButton();
            if(!isShortsPage()) {
                autoScroll = false;
            }
        }

        // Always try to find video if we're on shorts and scrolling is on
        if (isShortsPage() && autoScroll) {
            findAndAttachToVideo();
        }
    }

    // --- Initializer ---

    // Set up the main observer
    const observer = new MutationObserver(handlePageChanges);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial run
    createOrUpdateButton();

    console.log('YouTube Shorts Auto-Scroller (Clean Version) Loaded');
})();
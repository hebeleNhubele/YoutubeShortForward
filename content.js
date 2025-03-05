(function () {
    // Ensure we're on a Shorts page
    if (!window.location.href.includes('/shorts/')) {
        console.log("Not on YouTube Shorts page, exiting...");
        return;
    }

    console.log("YouTube Shorts Auto-Scroller Loaded");

    let autoScroll = false;
    let currentVideo = null;

    // Create the Start/Stop button with more visible styling
    const button = document.createElement('button');
    button.innerText = 'Start Auto-Scroll';
    button.style.position = 'fixed';
    button.style.top = '70px'; // Moved down to avoid YouTube header
    button.style.right = '20px';
    button.style.zIndex = '9999999'; // Increased z-index
    button.style.padding = '12px 20px';
    button.style.background = '#FF0000';
    button.style.color = '#FFFFFF';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = 'bold';
    button.style.fontSize = '14px';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    document.body.appendChild(button);

    function findNextButton() {
        // Try different selectors that YouTube might use
        // This is a list of different languages and their corresponding next button selectors
        const selectors = [
            'button[aria-label="Next video"]',
            'button[aria-label="Next"]',
            'button[aria-label="Siguiente"]',
            'button[aria-label="Próximo"]',
            'button[aria-label="Sonraki"]',
			'button[aria-label="Sonraki video"]'
        ];

        for (let selector of selectors) {
            const btn = document.querySelector(selector);
            if (btn) return btn;
        }
        return null;
    }

    function scrollToNext() {
        const nextButton = findNextButton();
        if (nextButton) {
            nextButton.click();
        } else {
            // Fallback to keyboard navigation
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

    function checkVideoProgress() {
        if (!autoScroll) return;
        
        const video = document.querySelector('video');
        if (!video || video === currentVideo) return;

        currentVideo = video;
        
        // Remove previous listeners if they exist
        video.removeEventListener('timeupdate', handleTimeUpdate);
        
        // Add new listener
        video.addEventListener('timeupdate', handleTimeUpdate);
    }

    function handleTimeUpdate(event) {
        const video = event.target;
        if (!video || !autoScroll) return;

        // Check if we're near the end of the video
        if (video.duration > 0 && 
            video.currentTime > 0 && 
            (video.duration - video.currentTime) < 0.5) {
            
            console.log("Video near end, scrolling to next...");
            scrollToNext();
            
            // Wait a bit before checking for the next video
            setTimeout(checkVideoProgress, 1000);
        }
    }

    // Toggle auto-scroll with error handling
    button.addEventListener('click', () => {
        autoScroll = !autoScroll;
        button.innerText = autoScroll ? 'Stop Auto-Scroll' : 'Start Auto-Scroll';
        button.style.background = autoScroll ? '#00FF00' : '#FF0000';
        console.log(autoScroll ? "Auto-scroll started" : "Auto-scroll stopped");
        
        if (autoScroll) {
            checkVideoProgress();
        }
    });

    // Check for video periodically
    setInterval(checkVideoProgress, 1000);

    // Handle dynamic content changes
    const observer = new MutationObserver((mutations) => {
        if (autoScroll) {
            checkVideoProgress();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();

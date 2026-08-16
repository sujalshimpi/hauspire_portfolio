document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('video-grid');
    const overlay = document.getElementById('video-overlay');
    const overlayVideo = document.getElementById('overlay-video');
    const closeBtn = document.getElementById('close-overlay');

    const TOTAL_VIDEOS = 6; // 6 videos in vidsss/ folder (1.mp4 to 6.mp4)
    const VIDEO_PATH = 'vidsss/';

    // ===== IntersectionObserver: only play videos in viewport =====
    const playObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target.querySelector('video');
            if (!video) return;

            if (entry.isIntersecting) {
                // Load and play when visible
                if (video.dataset.src && !video.src) {
                    video.src = video.dataset.src;
                }
                video.play().catch(() => { });
            } else {
                // Pause when off-screen to save resources
                video.pause();
            }
        });
    }, {
        rootMargin: '100px', // Start loading slightly before entering viewport
        threshold: 0.1
    });

    // ===== Fade-in Observer: animate tiles as they scroll into view =====
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target); // Only animate once
            }
        });
    }, {
        threshold: 0.05
    });

    // Function to create video tile
    function createVideoTile(index) {
        const tile = document.createElement('div');
        tile.className = 'video-tile';

        const video = document.createElement('video');
        // Use data-src for lazy loading; src set by IntersectionObserver
        video.dataset.src = `${VIDEO_PATH}${index}.mp4`;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('disableRemotePlayback', 'true');
        video.preload = 'none'; // Don't preload until visible
        video.setAttribute('decoding', 'async');

        // Error handling for missing videos
        video.onerror = () => {
            console.error(`Video ${index}.mp4 not found.`);
            tile.style.backgroundColor = '#222';
            tile.innerHTML = '<span style="color:#555;display:flex;justify-content:center;align-items:center;height:100%;">Video not found</span>';
        };

        tile.appendChild(video);

        // Click event to open overlay
        tile.addEventListener('click', () => {
            openOverlay(`${VIDEO_PATH}${index}.mp4`);
        });

        // Observe for lazy play + fade-in
        playObserver.observe(tile);
        fadeObserver.observe(tile);

        return tile;
    }

    // Generate grid — use DocumentFragment for a single DOM reflow
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= TOTAL_VIDEOS; i++) {
        fragment.appendChild(createVideoTile(i));
    }
    gridContainer.appendChild(fragment);

    // ===== Overlay =====

    function openOverlay(src) {
        overlay.classList.remove('hidden');
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });

        overlayVideo.src = src;
        overlayVideo.muted = false;
        overlayVideo.play().catch(e => console.log('Overlay play prevented:', e));
        document.body.style.overflow = 'hidden';
    }

    function closeOverlay() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';

        setTimeout(() => {
            overlay.classList.add('hidden');
            overlayVideo.pause();
            overlayVideo.removeAttribute('src');
            overlayVideo.load(); // Release buffered data
        }, 300);
    }

    // Event Listeners for closing
    closeBtn.addEventListener('click', closeOverlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeOverlay();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
            closeOverlay();
        }
    });
});

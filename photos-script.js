document.addEventListener('DOMContentLoaded', () => {
    const viewport = document.getElementById('gallery-viewport');
    const track = document.getElementById('gallery-track');
    const loader = document.getElementById('loader');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.getElementById('close-btn');

    const IMAGE_PATH = 'images/';
    const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
    const MAX_IMAGES = 100;

    let allImages = [];       // Unique image URLs in exact order: 1.jpg, 2.jpg...
    let currentLightboxIdx = -1;
    let oneSetHeight = 0;
    let rowsPerCycle = 0;
    let isResettingScroll = false;

    /**
     * Probe whether an image exists at the given path.
     */
    function probeImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    /**
     * Try extensions in parallel for a given number.
     */
    async function probeIndex(i) {
        const results = await Promise.all(
            EXTENSIONS.map(ext => probeImage(`${IMAGE_PATH}${i}.${ext}`))
        );
        return results.find(r => r !== null) || null;
    }

    /**
     * Batch-probe images in sequential order.
     */
    async function discoverImages() {
        const BATCH_SIZE = 10;
        const found = [];

        for (let start = 1; start <= MAX_IMAGES; start += BATCH_SIZE) {
            const end = Math.min(start + BATCH_SIZE - 1, MAX_IMAGES);
            const batch = [];
            for (let i = start; i <= end; i++) {
                batch.push(probeIndex(i));
            }
            const results = await Promise.all(batch);

            for (const res of results) {
                if (res) found.push(res);
            }

            if (results.every(r => r === null)) {
                break;
            }
        }
        return found;
    }

    /**
     * Calculate GCD and LCM for exact repeating triplets cycle.
     */
    function gcd(a, b) {
        return b === 0 ? a : gcd(b, a % b);
    }

    function lcm(a, b) {
        return (a * b) / gcd(a, b);
    }

    /**
     * Build the infinite 3-card gallery.
     */
    function buildGallery(images) {
        const totalImages = images.length;
        if (totalImages === 0) return;

        // Number of images in a full repeating 3-card cycle
        const totalCardsInCycle = lcm(totalImages, 3);
        rowsPerCycle = totalCardsInCycle / 3;

        // Generate ordered array of images for 1 full cycle
        const cycleImageIndices = [];
        for (let i = 0; i < totalCardsInCycle; i++) {
            cycleImageIndices.push(i % totalImages);
        }

        // We build 3 identical sets (Set 0: pre-clone, Set 1: primary, Set 2: post-clone)
        const SET_COUNT = 3;
        const fragment = document.createDocumentFragment();

        for (let s = 0; s < SET_COUNT; s++) {
            const setWrapper = document.createElement('div');
            setWrapper.className = `gallery-set gallery-set-${s}`;
            setWrapper.dataset.setIndex = s;

            for (let r = 0; r < rowsPerCycle; r++) {
                const rowEl = document.createElement('div');
                rowEl.className = 'gallery-row';
                rowEl.dataset.rowIndex = r;

                const leftImgIdx = cycleImageIndices[r * 3];
                const centerImgIdx = cycleImageIndices[r * 3 + 1];
                const rightImgIdx = cycleImageIndices[r * 3 + 2];

                // Left card
                const leftCard = createCard(images[leftImgIdx], leftImgIdx, 'card-left');
                // Center card
                const centerCard = createCard(images[centerImgIdx], centerImgIdx, 'card-center');
                // Right card
                const rightCard = createCard(images[rightImgIdx], rightImgIdx, 'card-right');

                rowEl.appendChild(leftCard);
                rowEl.appendChild(centerCard);
                rowEl.appendChild(rightCard);

                setWrapper.appendChild(rowEl);
            }
            fragment.appendChild(setWrapper);
        }

        track.appendChild(fragment);
    }

    /**
     * Create an individual gallery card.
     */
    function createCard(src, imgIndex, positionClass) {
        const card = document.createElement('div');
        card.className = `gallery-card ${positionClass}`;
        card.dataset.imgIndex = imgIndex;
        card.dataset.src = src;

        const img = document.createElement('img');
        img.src = src;
        img.alt = `Hauspire Luxury Design Portfolio - Photo ${imgIndex + 1}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.draggable = false;

        card.appendChild(img);

        // Click to open lightbox
        card.addEventListener('click', (e) => {
            if (isDragging) return; // Ignore click if user was dragging
            openLightbox(imgIndex);
        });

        return card;
    }

    /**
     * Measure single cycle height and initialize scroll position.
     */
    function initScrollPosition() {
        const set0 = track.querySelector('.gallery-set-0');
        if (!set0) return;

        oneSetHeight = set0.getBoundingClientRect().height;
        if (oneSetHeight === 0) {
            // If images are still rendering dimensions, re-try shortly
            requestAnimationFrame(initScrollPosition);
            return;
        }

        // Start in the middle of Set 1 for seamless scrolling in both directions
        viewport.scrollTop = oneSetHeight;

        // Reveal the viewport
        viewport.classList.add('loaded');
        loader.classList.add('hidden');

        updateDepthEffects();
    }

    /**
     * Infinite scroll boundary check (seamless loop with zero visual jump).
     */
    function handleInfiniteLoop() {
        if (isResettingScroll || oneSetHeight <= 0) return;

        const currentScroll = viewport.scrollTop;

        // If user scrolls up near Set 0, jump forward by oneSetHeight into Set 1
        if (currentScroll < oneSetHeight * 0.3) {
            isResettingScroll = true;
            viewport.scrollTop += oneSetHeight;
            isResettingScroll = false;
        }
        // If user scrolls down past Set 1 into Set 2, jump back by oneSetHeight into Set 1
        else if (currentScroll >= oneSetHeight * 1.7) {
            isResettingScroll = true;
            viewport.scrollTop -= oneSetHeight;
            isResettingScroll = false;
        }
    }

    /**
     * Dynamic depth & focus effect: rows near center get full presence,
     * rows further away subtly scale and soften.
     */
    let ticking = false;
    function updateDepthEffects() {
        const viewportHeight = viewport.clientHeight;
        const viewportCenter = viewportHeight / 2;
        const rows = track.querySelectorAll('.gallery-row');

        rows.forEach(row => {
            const rect = row.getBoundingClientRect();
            const rowCenter = rect.top + rect.height / 2;
            const distFromCenter = Math.abs(rowCenter - viewportCenter);
            const normalizedDist = Math.min(distFromCenter / (viewportHeight * 0.65), 1);

            // Subtle scale factor between 0.95 and 1.0
            const scale = 1 - (normalizedDist * 0.05);
            // Subtle opacity factor between 0.88 and 1.0
            const opacity = 1 - (normalizedDist * 0.12);

            row.style.transform = `scale(${scale.toFixed(4)})`;
            row.style.opacity = opacity.toFixed(3);
        });
    }

    function onScroll() {
        handleInfiniteLoop();

        if (!ticking) {
            requestAnimationFrame(() => {
                updateDepthEffects();
                ticking = false;
            });
            ticking = true;
        }
    }

    viewport.addEventListener('scroll', onScroll, { passive: true });

    // Handle window resize: recalculate setHeight
    window.addEventListener('resize', () => {
        const set0 = track.querySelector('.gallery-set-0');
        if (set0) {
            oneSetHeight = set0.getBoundingClientRect().height;
            updateDepthEffects();
        }
    });

    // ===== Desktop Drag-to-Scroll Support for fluid feel =====
    let isMouseDown = false;
    let isDragging = false;
    let startY = 0;
    let scrollStart = 0;
    let dragDistance = 0;

    viewport.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        isDragging = false;
        startY = e.pageY;
        scrollStart = viewport.scrollTop;
        dragDistance = 0;
        viewport.style.cursor = 'grabbing';
        viewport.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        const deltaY = e.pageY - startY;
        dragDistance += Math.abs(deltaY);
        if (dragDistance > 6) {
            isDragging = true;
        }
        viewport.scrollTop = scrollStart - deltaY;
    });

    window.addEventListener('mouseup', () => {
        if (isMouseDown) {
            isMouseDown = false;
            viewport.style.cursor = '';
            viewport.style.userSelect = '';
            setTimeout(() => { isDragging = false; }, 50);
        }
    });

    // ===== Lightbox Functions =====
    function openLightbox(index) {
        currentLightboxIdx = index;
        lightboxImg.src = allImages[index];
        lightboxImg.alt = `Hauspire Luxury Design Portfolio - Photo ${index + 1}`;

        requestAnimationFrame(() => {
            lightbox.classList.add('active');
        });

        document.body.style.overflow = 'hidden';
        preloadAdjacent(index);
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        currentLightboxIdx = -1;

        setTimeout(() => {
            lightboxImg.src = '';
        }, 350);
    }

    function navigateLightbox(direction) {
        if (currentLightboxIdx < 0 || allImages.length === 0) return;
        // Infinite cycle inside lightbox as well
        currentLightboxIdx = (currentLightboxIdx + direction + allImages.length) % allImages.length;
        lightboxImg.src = allImages[currentLightboxIdx];
        lightboxImg.alt = `Hauspire Luxury Design Portfolio - Photo ${currentLightboxIdx + 1}`;
        preloadAdjacent(currentLightboxIdx);
    }

    function preloadAdjacent(index) {
        [-1, 1].forEach(offset => {
            const i = (index + offset + allImages.length) % allImages.length;
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.as = 'image';
            link.href = allImages[i];
            document.head.appendChild(link);
        });
    }

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLightbox();
    });

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowLeft') {
            navigateLightbox(-1);
        } else if (e.key === 'ArrowRight') {
            navigateLightbox(1);
        }
    });

    // Touch Swipe inside Lightbox
    let lbTouchStartX = 0;
    let lbTouchStartY = 0;

    lightbox.addEventListener('touchstart', (e) => {
        lbTouchStartX = e.changedTouches[0].screenX;
        lbTouchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
        if (!lightbox.classList.contains('active')) return;
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const diffX = touchEndX - lbTouchStartX;
        const diffY = touchEndY - lbTouchStartY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
            if (diffX < 0) {
                navigateLightbox(1);
            } else {
                navigateLightbox(-1);
            }
        }
    }, { passive: true });

    // ===== Initialize =====
    async function init() {
        const images = await discoverImages();
        allImages = images;

        if (images.length === 0) {
            loader.textContent = 'No images found in images/ directory.';
            return;
        }

        buildGallery(images);

        // Wait for first image to load or DOM paint to accurately measure heights
        const firstImg = track.querySelector('img');
        if (firstImg) {
            if (firstImg.complete) {
                initScrollPosition();
            } else {
                firstImg.addEventListener('load', initScrollPosition);
                firstImg.addEventListener('error', initScrollPosition);
            }
        } else {
            initScrollPosition();
        }
    }

    init();
});

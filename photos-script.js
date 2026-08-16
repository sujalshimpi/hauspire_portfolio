document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('masonry-grid');
    const loader = document.getElementById('loader');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.getElementById('close-btn');

    const IMAGE_PATH = 'images/';
    const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
    const MAX_IMAGES = 200;

    let imagesLoaded = 0;
    let totalFound = 0;
    let allImages = []; // Track all image sources for arrow-key navigation
    let currentIndex = -1;

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
     * For a given index, try all extensions in parallel and return first match.
     */
    async function probeIndex(i) {
        const results = await Promise.all(
            EXTENSIONS.map(ext => probeImage(`${IMAGE_PATH}${i}.${ext}`))
        );
        return results.find(r => r !== null) || null;
    }

    /**
     * Batch-probe images in parallel chunks for faster discovery.
     * Probes in batches of BATCH_SIZE to avoid overwhelming the browser.
     */
    async function discoverImages() {
        const BATCH_SIZE = 10;
        const foundImages = [];

        for (let start = 1; start <= MAX_IMAGES; start += BATCH_SIZE) {
            const end = Math.min(start + BATCH_SIZE - 1, MAX_IMAGES);
            const batch = [];

            for (let i = start; i <= end; i++) {
                batch.push(probeIndex(i));
            }

            const results = await Promise.all(batch);
            let hadGap = false;

            for (const result of results) {
                if (result) {
                    foundImages.push(result);
                } else {
                    hadGap = true;
                }
            }

            // Stop if entire batch had no images (we're past the last one)
            if (results.every(r => r === null)) {
                break;
            }
        }

        return foundImages;
    }

    // ===== Fade-in Observer =====
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05 });

    /**
     * Create a masonry grid item.
     */
    function createMasonryItem(src, index) {
        const item = document.createElement('div');
        item.className = 'masonry-item';

        const img = document.createElement('img');
        img.src = src;
        img.alt = `Gallery image ${index + 1}`;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.draggable = false;

        img.addEventListener('load', () => {
            imagesLoaded++;
            if (imagesLoaded >= totalFound) {
                loader.classList.add('hidden');
            }
        });

        img.addEventListener('error', () => {
            item.style.display = 'none';
            imagesLoaded++;
            if (imagesLoaded >= totalFound) {
                loader.classList.add('hidden');
            }
        });

        item.addEventListener('click', () => {
            openLightbox(index);
        });

        item.appendChild(img);
        fadeObserver.observe(item);
        return item;
    }

    // ===== Lightbox =====

    function openLightbox(index) {
        currentIndex = index;
        lightboxImg.src = allImages[index];
        lightboxImg.alt = `Gallery image ${index + 1}`;

        requestAnimationFrame(() => {
            lightbox.classList.add('active');
        });

        document.body.style.overflow = 'hidden';

        // Preload adjacent images for instant navigation
        preloadAdjacent(index);
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        currentIndex = -1;

        setTimeout(() => {
            lightboxImg.src = '';
        }, 350);
    }

    function navigateLightbox(direction) {
        if (currentIndex < 0) return;
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < allImages.length) {
            currentIndex = newIndex;
            lightboxImg.src = allImages[currentIndex];
            lightboxImg.alt = `Gallery image ${currentIndex + 1}`;
            preloadAdjacent(currentIndex);
        }
    }

    function preloadAdjacent(index) {
        [-1, 1].forEach(offset => {
            const i = index + offset;
            if (i >= 0 && i < allImages.length) {
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.as = 'image';
                link.href = allImages[i];
                document.head.appendChild(link);
            }
        });
    }

    // ===== Event Listeners =====

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

        switch (e.key) {
            case 'Escape':
                closeLightbox();
                break;
            case 'ArrowLeft':
                navigateLightbox(-1);
                break;
            case 'ArrowRight':
                navigateLightbox(1);
                break;
        }
    });

    // ===== Touch Swipe Gestures for Mobile Lightbox =====
    let touchStartX = 0;
    let touchStartY = 0;

    lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
        if (!lightbox.classList.contains('active')) return;
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const diffX = touchEndX - touchStartX;
        const diffY = touchEndY - touchStartY;

        // Ensure horizontal swipe is dominant and exceeds minimum threshold (40px)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
            if (diffX < 0) {
                navigateLightbox(1); // Swipe left -> next image
            } else {
                navigateLightbox(-1); // Swipe right -> prev image
            }
        }
    }, { passive: true });

    // ===== Initialize =====

    async function init() {
        const images = await discoverImages();
        allImages = images;
        totalFound = images.length;

        if (totalFound === 0) {
            loader.textContent = 'No images found. Add numbered images (1.jpg, 2.jpg, ...) to the images/ folder.';
            return;
        }

        const fragment = document.createDocumentFragment();
        images.forEach((src, index) => {
            fragment.appendChild(createMasonryItem(src, index));
        });
        grid.appendChild(fragment);
    }

    init();
});

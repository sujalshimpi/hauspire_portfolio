/**
 * Hauspire Luxury Design Studio — Dual Horizontal Infinite Carousels
 * Row 1: Photos 1 to 6
 * Row 2: Photos 7 to 14
 */

document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const container = document.querySelector('.gallery-dual-container');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.getElementById('close-btn');

    // Row 1: Photos 1 to 6
    const ROW_1_IMAGES = [
        'images/1.jpg',
        'images/2.jpg',
        'images/3.jpg',
        'images/4.jpg',
        'images/5.jpg',
        'images/6.jpg'
    ];

    // Row 2: Photos 7 to 14
    const ROW_2_IMAGES = [
        'images/7.jpg',
        'images/8.jpg',
        'images/9.jpg',
        'images/10.jpg',
        'images/11.jpg',
        'images/12.jpg',
        'images/13.jpg',
        'images/14.jpg'
    ];

    const ALL_IMAGES = [...ROW_1_IMAGES, ...ROW_2_IMAGES];
    let currentLightboxIdx = -1;

    /**
     * Circular Continuous Infinite Carousel Engine
     */
    class InfiniteCarousel {
        constructor({ viewport, track, images, onCardClick }) {
            this.viewport = viewport;
            this.track = track;
            this.images = images;
            this.total = images.length;
            this.onCardClick = onCardClick;

            this.pos = 0;          // Continuous floating-point position
            this.targetPos = 0;    // Target position for spring physics
            this.velocity = 0;
            this.isDragging = false;
            this.hasDragged = false;
            this.startX = 0;
            this.startY = 0;
            this.lastX = 0;
            this.lastTime = 0;
            this.isHorizontalSwipe = false;
            this.isGestureDecided = false;
            this.spacing = 240;

            this.cardElements = [];
            this.initCards();
            this.initEvents();
            this.updateSpacing();
        }

        initCards() {
            this.track.innerHTML = '';
            this.cardElements = [];
            this.lastPos = -9999;

            this.images.forEach((src, idx) => {
                const card = document.createElement('div');
                card.className = 'carousel-card';
                card.dataset.index = idx;
                card.dataset.src = src;

                const img = document.createElement('img');
                img.src = src;
                img.alt = `Hauspire Luxury Design Studio - Portfolio Image`;
                // Priority loading for initial visible cards (center and adjacent)
                if (idx === 0 || idx === 1 || idx === this.total - 1) {
                    img.loading = 'eager';
                    img.setAttribute('fetchpriority', 'high');
                } else {
                    img.loading = 'lazy';
                    img.setAttribute('fetchpriority', 'low');
                }
                img.decoding = 'async';
                img.draggable = false;

                // Pre-decode adjacent images for zero-lag swipes
                if (img.decode) {
                    img.decode().catch(() => {});
                }

                card.appendChild(img);

                card.addEventListener('click', () => {
                    if (this.hasDragged) return;
                    this.onCardClick(src, idx, this.images);
                });

                this.track.appendChild(card);
                this.cardElements.push(card);
            });
        }

        updateSpacing() {
            if (this.cardElements.length > 0) {
                const rect = this.cardElements[0].getBoundingClientRect();
                const cardW = rect.width || (this.viewport.clientHeight * 0.84 * (9 / 13));
                this.spacing = Math.max(140, cardW * 0.74);
                this.lastPos = -9999; // force redraw on resize
            }
        }

        initEvents() {
            // Touch Events (Mobile priority)
            this.viewport.addEventListener('touchstart', (e) => {
                if (e.touches.length !== 1) return;
                this.isDragging = true;
                this.hasDragged = false;
                this.isGestureDecided = false;
                this.isHorizontalSwipe = false;
                this.velocity = 0;
                this.startX = e.touches[0].clientX;
                this.startY = e.touches[0].clientY;
                this.lastX = this.startX;
                this.lastTime = performance.now();
            }, { passive: true });

            this.viewport.addEventListener('touchmove', (e) => {
                if (!this.isDragging) return;
                const curX = e.touches[0].clientX;
                const curY = e.touches[0].clientY;
                const diffX = curX - this.startX;
                const diffY = curY - this.startY;

                if (!this.isGestureDecided) {
                    if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
                        this.isGestureDecided = true;
                        this.isHorizontalSwipe = Math.abs(diffX) >= Math.abs(diffY);
                    }
                }

                if (this.isHorizontalSwipe) {
                    if (e.cancelable) e.preventDefault();
                    this.hasDragged = true;

                    const dx = curX - this.lastX;
                    const now = performance.now();
                    const dt = now - this.lastTime;

                    if (dt > 0) {
                        this.velocity = -(dx / this.spacing) * (16 / Math.max(dt, 8));
                    }

                    this.targetPos -= dx / this.spacing;
                    this.pos = this.targetPos; // Direct tracking during drag
                    this.lastX = curX;
                    this.lastTime = now;
                }
            }, { passive: false });

            const onTouchEnd = () => {
                if (!this.isDragging) return;
                this.isDragging = false;
                this.velocity = Math.max(-0.35, Math.min(0.35, this.velocity));
                setTimeout(() => { this.hasDragged = false; }, 60);
            };

            this.viewport.addEventListener('touchend', onTouchEnd, { passive: true });
            this.viewport.addEventListener('touchcancel', onTouchEnd, { passive: true });

            // Mouse Events (Desktop drag)
            this.viewport.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                this.isDragging = true;
                this.hasDragged = false;
                this.velocity = 0;
                this.startX = e.clientX;
                this.lastX = e.clientX;
                this.lastTime = performance.now();
            });

            window.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                const curX = e.clientX;
                const dx = curX - this.lastX;

                if (Math.abs(curX - this.startX) > 4) {
                    this.hasDragged = true;
                }

                const now = performance.now();
                const dt = now - this.lastTime;

                if (dt > 0) {
                    this.velocity = -(dx / this.spacing) * (16 / Math.max(dt, 8));
                }

                this.targetPos -= dx / this.spacing;
                this.pos = this.targetPos;
                this.lastX = curX;
                this.lastTime = now;
            });

            window.addEventListener('mouseup', () => {
                if (this.isDragging) {
                    this.isDragging = false;
                    this.velocity = Math.max(-0.35, Math.min(0.35, this.velocity));
                    setTimeout(() => { this.hasDragged = false; }, 60);
                }
            });

            // Wheel / Trackpad horizontal scroll support
            this.viewport.addEventListener('wheel', (e) => {
                const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
                if (Math.abs(delta) > 2) {
                    this.targetPos += (delta * 0.0018);
                    this.velocity = 0;
                }
            }, { passive: true });
        }

        render() {
            // Physics / Friction update
            if (!this.isDragging) {
                this.targetPos += this.velocity;
                this.velocity *= 0.90; // Inertia friction

                if (Math.abs(this.velocity) < 0.0008) {
                    this.velocity = 0;
                    // Gentle spring snap to nearest centered item
                    this.targetPos += (Math.round(this.targetPos) - this.targetPos) * 0.12;
                }

                // Smooth spring interpolation
                this.pos += (this.targetPos - this.pos) * 0.20;
            }

            // Optimization: skip DOM writes if change is sub-threshold
            if (Math.abs(this.pos - this.lastPos) < 0.0001 && !this.isDragging && this.velocity === 0) {
                return;
            }
            this.lastPos = this.pos;

            const N = this.total;

            for (let i = 0; i < N; i++) {
                // Continuous wrapped offset relative to current position in range [-N/2, +N/2]
                let offset = (i - (this.pos % N) + N * 1.5) % N - (N / 2);

                const x = offset * this.spacing;
                const absOffset = Math.abs(offset);

                // Scale: Center = 1.08, side at absOffset 1 = ~0.90, further away = ~0.76
                const scale = Math.max(0.72, 1.08 - Math.min(absOffset, 2) * 0.18);

                // Z-Index: Center card is topmost (50), sides layer under (30..10)
                const zIndex = Math.round(50 - Math.min(absOffset, 3) * 12);

                // Opacity: Center and sides fully visible, smooth fade for cards further out
                let opacity = 1;
                if (absOffset > 1.4) {
                    opacity = Math.max(0, 1 - (absOffset - 1.4) * 2.2);
                }

                const card = this.cardElements[i];
                if (opacity <= 0.001) {
                    card.style.visibility = 'hidden';
                } else {
                    card.style.visibility = 'visible';
                    card.style.opacity = opacity.toFixed(3);
                    card.style.zIndex = zIndex;
                    card.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), -50%, 0) scale(${scale.toFixed(4)})`;
                }
            }
        }
    }

    // ===== Lightbox Implementation =====
    function openLightbox(src, rowIdx, rowImages) {
        currentLightboxIdx = ALL_IMAGES.indexOf(src);
        if (currentLightboxIdx === -1) currentLightboxIdx = 0;

        lightboxImg.src = ALL_IMAGES[currentLightboxIdx];
        lightboxImg.alt = `Hauspire Luxury Design Studio - Image ${currentLightboxIdx + 1}`;

        requestAnimationFrame(() => {
            lightbox.classList.add('active');
        });

        document.body.style.overflow = 'hidden';
        preloadAdjacent(currentLightboxIdx);
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
        if (currentLightboxIdx < 0 || ALL_IMAGES.length === 0) return;
        currentLightboxIdx = (currentLightboxIdx + direction + ALL_IMAGES.length) % ALL_IMAGES.length;
        lightboxImg.src = ALL_IMAGES[currentLightboxIdx];
        lightboxImg.alt = `Hauspire Luxury Design Studio - Image ${currentLightboxIdx + 1}`;
        preloadAdjacent(currentLightboxIdx);
    }

    function preloadAdjacent(index) {
        [-1, 1].forEach(offset => {
            const i = (index + offset + ALL_IMAGES.length) % ALL_IMAGES.length;
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.as = 'image';
            link.href = ALL_IMAGES[i];
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
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
    });

    // Lightbox Mobile Touch Swipe
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

    // ===== Initialize Both Carousels =====
    const carousel1 = new InfiniteCarousel({
        viewport: document.getElementById('carousel-viewport-1'),
        track: document.getElementById('carousel-track-1'),
        images: ROW_1_IMAGES,
        onCardClick: openLightbox
    });

    const carousel2 = new InfiniteCarousel({
        viewport: document.getElementById('carousel-viewport-2'),
        track: document.getElementById('carousel-track-2'),
        images: ROW_2_IMAGES,
        onCardClick: openLightbox
    });

    // Handle Resize
    window.addEventListener('resize', () => {
        carousel1.updateSpacing();
        carousel2.updateSpacing();
    });

    // Continuous Animation Loop (60fps)
    function loop() {
        carousel1.render();
        carousel2.render();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    // Reveal UI once loaded
    requestAnimationFrame(() => {
        carousel1.updateSpacing();
        carousel2.updateSpacing();
        container.classList.add('loaded');
        loader.classList.add('hidden');
    });
});

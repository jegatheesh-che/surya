import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    query, 
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// CONFIGURATION
// NOTE: Firebase client configuration is intentionally public.
// Security is enforced server-side via Firebase Authentication and
// Firestore Security Rules. Read-only gallery access is by design;
// all writes require an authenticated admin session.
// See: https://firebase.google.com/docs/projects/api-keys
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyADbXVx3b_DtClpoRGcy75e_Iq9bI8FCgI",
    authDomain: "project2-f50fa.firebaseapp.com",
    projectId: "project2-f50fa",
    storageBucket: "project2-f50fa.firebasestorage.app",
    messagingSenderId: "145748902606",
    appId: "1:145748902606:web:b2144e287ef6668a29469f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// GALLERY LOGIC
// ==========================================
const galleryGrid = document.getElementById('gallery-grid');
const filtersContainer = document.getElementById('gallery-filters');

// Bento Grid Spans Pattern
const bentoPattern = [
    'col-span-2 row-span-2', // Large Square
    'col-span-1 row-span-1', // Small Square
    'col-span-1 row-span-1', // Small Square
    'col-span-2 md:col-span-1 row-span-2', // Vertical Rectangle
    'col-span-2 md:col-span-1 row-span-1', // Wide Rectangle
    'col-span-1 row-span-1', // Small Square
    'col-span-1 row-span-1', // Small Square
    'col-span-2 md:col-span-2 row-span-1'  // Wide Rectangle
];

let galleryData = [];
let categoriesList = [];
let lastFocusedGalleryItem = null; // Tracks trigger element for focus restoration after lightbox closes

// Descriptive alt text mapped by photography category
const categoryAltText = {
    'weddings':      'Wedding ceremony and couple photography by Surya Photography',
    'portraits':     'Professional portrait photography session by Surya Photography',
    'events':        'Cultural event and celebration photography by Surya Photography',
    'maternity':     'Maternity portrait session by Surya Photography',
    'lifestyle':     'Lifestyle and candid photography by Surya Photography',
    'uncategorized': 'Photography by Surya Photography'
};
function getPhotoAltText(category) {
    return categoryAltText[category] || `${category} photography by Surya Photography`;
}

// Fallback data if Firebase is unconfigured
const fallbackData = [
    { src: 'assets/images/Copy%20of%20DSC00343.jpg', category: 'weddings',  alt: 'Wedding couple in a golden-hour outdoor portrait' },
    { src: 'assets/images/Copy%20of%20DSC00602.jpg', category: 'portraits', alt: 'Professional portrait session with natural light' },
    { src: 'assets/images/DSC00147.jpg',          category: 'maternity', alt: 'Maternity portrait in a soft natural outdoor setting' },
    { src: 'assets/images/DSC02092.jpg',          category: 'lifestyle', alt: 'Candid lifestyle moment captured by Surya Photography' }
];

// Module-scoped IntersectionObserver — created once, reused on every renderGallery() call.
// Calling observer.disconnect() before each render releases old references
// and prevents observer accumulation across filter changes.
const galleryRevealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            galleryRevealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

async function initGallery() {
    try {
        if (firebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY") {
            throw new Error("Firebase not configured");
        }

        // Fetch categories
        const catQ = query(collection(db, "categories"), orderBy("name"));
        const catSnap = await getDocs(catQ);
        categoriesList = [];
        catSnap.forEach(doc => {
            categoriesList.push({ id: doc.id, name: doc.data().name });
        });
        renderFilters(categoriesList);

        // Fetch images (ordered by createdAt DESC)
        const imgQ = query(collection(db, "images"), orderBy("createdAt", "desc"));
        const imgSnap = await getDocs(imgQ);
        galleryData = [];
        
        imgSnap.forEach(doc => {
            const data = doc.data();
            const cat = categoriesList.find(c => c.id === data.category_id);
            galleryData.push({
                id: doc.id,
                src: data.imageUrl,
                thumb: data.thumbnailUrl || data.imageUrl,
                type: data.type || 'image',
                category: cat ? cat.name.toLowerCase() : 'uncategorized'
            });
        });

    } catch (e) {
        galleryData = fallbackData;
        // Keep hardcoded filters if fallback
    }

    if (galleryGrid) {
        // Clear the static HTML fallback now that JS is running and
        // will render images dynamically from Firebase (or fallback data).
        // The static images in gallery.html only exist for SEO/non-JS users.
        galleryGrid.innerHTML = '';

        // Event delegation: single listener replaces per-item inline onclick handlers
        galleryGrid.addEventListener('click', (e) => {
            const item = e.target.closest('[data-src]');
            if (item) {
                lastFocusedGalleryItem = item;
                openLightbox(item.dataset.src, item.dataset.type || 'image');
            }
        });
        // Keyboard support: Enter/Space opens lightbox for keyboard-only users
        galleryGrid.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const item = e.target.closest('[data-src]');
                if (item) {
                    e.preventDefault();
                    lastFocusedGalleryItem = item;
                    openLightbox(item.dataset.src, item.dataset.type || 'image');
                }
            }
        });
        renderGallery();
        setupFilterListeners();
    }
}

function renderFilters(categories) {
    if (!filtersContainer) return;
    
    let html = `<button class="filter-btn active text-[10px] uppercase tracking-widest font-main" data-filter="all">All</button>`;
    categories.forEach(cat => {
        html += `<button class="filter-btn text-[10px] uppercase tracking-widest font-main" data-filter="${cat.name.toLowerCase()}">${cat.name}</button>`;
    });
    
    filtersContainer.innerHTML = html;
}

function renderGallery(filter = 'all') {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';
    let delay = 0;
    let renderIndex = 0;
    
    galleryData.forEach((item) => {
        if (filter === 'all' || item.category === filter) {
            const spanClass = bentoPattern[renderIndex % bentoPattern.length];
            const isVideo = item.type === 'video';
            const altText = item.alt || getPhotoAltText(item.category);

            const itemHtml = `
                <div class="bento-item photo-reveal ${spanClass}" style="transition-delay: ${delay}ms;" data-id="${item.id}" data-src="${item.src}" data-type="${item.type || 'image'}" role="button" tabindex="0" aria-label="View photo">
                    <img src="${item.thumb || item.src}" alt="${altText}" loading="lazy">
                    ${isVideo ? '<div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors" aria-hidden="true"><div class="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white shadow-lg backdrop-filter"><i class="fas fa-play text-lg ml-1" aria-hidden="true"></i></div></div>' : ''}
                    <div class="overlay" aria-hidden="true"></div>
                </div>
            `;
            galleryGrid.insertAdjacentHTML('beforeend', itemHtml);
            delay += 50;
            renderIndex++;
        }
    });
    
    // Disconnect previous observations to prevent accumulation across filter changes,
    // then re-observe the newly rendered elements.
    galleryRevealObserver.disconnect();
    setTimeout(() => {
        document.querySelectorAll('.photo-reveal').forEach(el => galleryRevealObserver.observe(el));
    }, 100);
}

function setupFilterListeners() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            galleryGrid.style.opacity = '0';
            setTimeout(() => {
                renderGallery(btn.getAttribute('data-filter'));
                galleryGrid.style.opacity = '1';
            }, 400);
        });
    });
    galleryGrid.style.transition = 'opacity 0.4s ease';
}

// ==========================================
// LIGHTBOX
// ==========================================
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxVideo = document.getElementById('lightbox-video');
const lightboxClose = document.getElementById('lightbox-close');

window.openLightbox = function(src, type = 'image') {
    if (lightbox) {
        if (type === 'video' && lightboxVideo) {
            lightboxImg.classList.add('hidden');
            lightboxVideo.classList.remove('hidden');
            lightboxVideo.src = src;
        } else if (lightboxImg) {
            lightboxVideo?.classList.add('hidden');
            lightboxImg.classList.remove('hidden');
            lightboxImg.src = src;
        }
        
        lightbox.classList.remove('hidden');
        lightbox.classList.add('flex');
        lightbox.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
            lightbox.style.opacity = '1';
            // Move focus to close button for keyboard and screen-reader users
            if (lightboxClose) lightboxClose.focus();
        }, 10);
    }
}

window.closeLightbox = function() {
    if (lightbox) {
        lightbox.style.opacity = '0';
        lightbox.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            lightbox.classList.add('hidden');
            lightbox.classList.remove('flex');
            // Pause video and clear src to stop buffering
            if (lightboxVideo) {
                lightboxVideo.pause();
                lightboxVideo.src = '';
            }
            // Restore focus to the gallery item that triggered the lightbox
            if (lastFocusedGalleryItem) lastFocusedGalleryItem.focus();
        }, 300);
    }
}

if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
}

// Close lightbox on Escape key (WCAG 2.1 — 2.1.2 No Keyboard Trap)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox && !lightbox.classList.contains('hidden')) {
        closeLightbox();
    }
});

initGallery();

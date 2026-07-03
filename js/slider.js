document.addEventListener("DOMContentLoaded", () => {
  // ── Hero Slider with lazy-loading for slides 2-4 ──────────────────────────
  const slides = document.querySelectorAll(".hero-slide");
  if (slides.length === 0) return;

  let currentSlide = 0;
  let slidesLoaded = false;

  // Lazy-load all deferred slides (data-src / source[data-srcset]) before
  // the slider first advances. This avoids fetching 3 large images on load.
  function loadLazySlides() {
    if (slidesLoaded) return;
    slidesLoaded = true;
    document.querySelectorAll(".lazy-slide").forEach((img) => {
      // Load <source data-srcset>
      const picture = img.closest("picture");
      if (picture) {
        picture.querySelectorAll("source[data-srcset]").forEach((source) => {
          source.srcset = source.dataset.srcset;
          delete source.dataset.srcset;
        });
      }
      // Load <img data-src>
      if (img.dataset.src) {
        img.src = img.dataset.src;
        delete img.dataset.src;
      }
      img.classList.remove("lazy-slide");
    });
  }

  function nextSlide() {
    // Load deferred slides just before the first auto-advance
    loadLazySlides();
    slides[currentSlide].classList.remove("active");
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add("active");
  }

  // First advance after 2 s; lazy images are fetched ~500 ms before shown
  setInterval(nextSlide, 2000);
});

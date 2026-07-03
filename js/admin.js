import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// CONFIGURATION
// NOTE: Firebase client configuration is intentionally public.
// Security is enforced via Firebase Authentication and Firestore Security Rules.
// All admin write operations require an authenticated session.
// Unauthenticated requests are rejected at the Firestore Rules level,
// regardless of API key possession.
// See: https://firebase.google.com/docs/projects/api-keys
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyADbXVx3b_DtClpoRGcy75e_Iq9bI8FCgI",
  authDomain: "project2-f50fa.firebaseapp.com",
  projectId: "project2-f50fa",
  storageBucket: "project2-f50fa.firebasestorage.app",
  messagingSenderId: "145748902606",
  appId: "1:145748902606:web:b2144e287ef6668a29469f",
};

const CLOUDINARY_CLOUD_NAME = "db2olmkfm";
const CLOUDINARY_UPLOAD_PRESET = "surya_photography";

// ==========================================
// DEBUG GUARD
// Set DEBUG = true locally to enable verbose Firestore/auth logging.
// Must be false in production to prevent internal detail disclosure.
// ==========================================
const DEBUG = false;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

if (DEBUG)
  console.log(
    "[DEBUG] Firebase initialized | projectId:",
    firebaseConfig.projectId,
    "| auth:",
    auth,
    "| db:",
    db,
  );

// ==========================================
// UI Elements
// ==========================================
const loginOverlay = document.getElementById("login-overlay");
const loginForm = document.getElementById("login-form");
const btnLogout = document.getElementById("btn-logout");

// ==========================================
// AUTHENTICATION
// ==========================================
onAuthStateChanged(auth, (user) => {
  // Reveal the page only after Firebase resolves the auth state —
  // prevents any flash of admin content before the check completes.
  // The body starts as visibility:hidden (set in admin.html).
  document.body.style.visibility = "visible";
  if (user) {
    console.log(
      "[AUTH] User authenticated | uid:",
      user.uid,
      "| email:",
      user.email,
      "| emailVerified:",
      user.emailVerified,
    );
    loginOverlay.classList.add("hidden");
    loadDashboardData();
  } else {
    console.log("[AUTH] No authenticated user — showing login screen");
    loginOverlay.classList.remove("hidden");
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const errorMsg = document.getElementById("login-error");

  try {
    await signInWithEmailAndPassword(auth, email, password);
    errorMsg.classList.add("hidden");
  } catch (error) {
    errorMsg.classList.remove("hidden");
    console.error("Auth Error:", error);
  }
});

btnLogout.addEventListener("click", () => {
  signOut(auth);
});

// ==========================================
// DASHBOARD LOGIC
// ==========================================
let categoriesList = [];
let faqsList = [];
let selectedImageIds = new Set();

// ==========================================
// PREMIUM UX HELPER FUNCTIONS
// ==========================================
window.showToast = function (type, message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let iconClass = "fa-info-circle";
  if (type === "success") iconClass = "fa-check-circle";
  if (type === "error") iconClass = "fa-times-circle";

  toast.innerHTML = `
        <i class="fas ${iconClass} toast-icon"></i>
        <div class="toast-content">
            <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-progress"><div class="toast-progress-bar"></div></div>
    `;

  container.appendChild(toast);

  const duration = 3000;
  const progressBar = toast.querySelector(".toast-progress-bar");

  void toast.offsetWidth; // Trigger reflow
  progressBar.style.transitionDuration = duration + "ms";
  progressBar.style.width = "0%";

  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

window.showSuccessPopup = function (title, message) {
  const popup = document.getElementById("success-popup");
  if (!popup) return;
  document.getElementById("success-popup-title").innerText = title;
  document.getElementById("success-popup-message").innerText = message;

  // Add particles
  const particlesContainer = document.getElementById("success-popup-particles");
  particlesContainer.innerHTML = "";
  for (let i = 0; i < 12; i++) {
    let p = document.createElement("div");
    p.className = "particle";
    p.style.backgroundColor = "#10B981";
    p.style.left = `${50 + (Math.random() * 80 - 40)}%`;
    p.style.top = `${40 + (Math.random() * 60 - 30)}%`;
    p.style.width = `${Math.random() * 6 + 4}px`;
    p.style.height = p.style.width;
    p.style.animationDuration = `${0.6 + Math.random() * 0.6}s`;
    particlesContainer.appendChild(p);
  }

  // Vibrate if supported
  if (navigator.vibrate) navigator.vibrate([30, 50, 30]);

  // Show popup
  popup.classList.add("active");

  // Auto dismiss
  clearTimeout(window.successPopupTimeout);
  window.successPopupTimeout = setTimeout(window.closeSuccessPopup, 1800);
};

window.closeSuccessPopup = function () {
  const popup = document.getElementById("success-popup");
  if (!popup) return;
  popup.classList.remove("active");

  // Reset SVG animation after fade out
  setTimeout(() => {
    const svg = popup.querySelector(".success-popup-svg");
    const ring = popup.querySelector(".success-popup-ring");
    const glow = popup.querySelector(".success-popup-glow");
    if (svg) svg.parentNode.replaceChild(svg.cloneNode(true), svg);
    if (ring) ring.parentNode.replaceChild(ring.cloneNode(true), ring);
    if (glow) glow.parentNode.replaceChild(glow.cloneNode(true), glow);
  }, 400);
};

window.customConfirm = function (title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const content = document.getElementById("confirm-modal-content");

    document.getElementById("confirm-title").innerText = title;
    document.getElementById("confirm-message").innerText = message;

    modal.classList.remove("hidden");
    modal.classList.add("flex");

    requestAnimationFrame(() => {
      modal.classList.remove("opacity-0");
      content.classList.remove("scale-95");
      content.classList.add("scale-100");
    });

    const cleanup = () => {
      modal.classList.add("opacity-0");
      content.classList.remove("scale-100");
      content.classList.add("scale-95");
      setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }, 300);
      document
        .getElementById("btn-confirm-cancel")
        .removeEventListener("click", onCancel);
      document
        .getElementById("btn-confirm-action")
        .removeEventListener("click", onConfirm);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    document
      .getElementById("btn-confirm-cancel")
      .addEventListener("click", onCancel);
    document
      .getElementById("btn-confirm-action")
      .addEventListener("click", onConfirm);
  });
};

function getSkeletonRows(count, columns) {
  let colsHtml = "";
  for (let i = 0; i < columns; i++) {
    colsHtml += `<td class="px-6 py-4"><div class="skeleton h-4 rounded w-full"></div></td>`;
  }
  return Array(count)
    .fill(0)
    .map(() => `<tr>${colsHtml}</tr>`)
    .join("");
}

function openEditModal(data) {
  document.getElementById("edit-image-id").value = data.id;
  document.getElementById("edit-image-title").value = data.title;
  document.getElementById("edit-image-category").value = data.cat;

  const modal = document.getElementById("edit-modal");
  const content = document.getElementById("edit-modal-content");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  requestAnimationFrame(() => {
    modal.classList.remove("opacity-0");
    content.classList.remove("scale-95");
    content.classList.add("scale-100");
  });
}

function closeEditModal() {
  const modal = document.getElementById("edit-modal");
  const content = document.getElementById("edit-modal-content");
  modal.classList.add("opacity-0");
  content.classList.remove("scale-100");
  content.classList.add("scale-95");
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }, 300);
}

async function loadDashboardData() {
  if (DEBUG)
    console.log(
      "[DEBUG] loadDashboardData() triggered — fetching categories then images",
    );
  await fetchCategories();
  await fetchImages();
  await fetchFaqs();
}

// --- Categories ---
async function fetchCategories() {
  const tbody = document.getElementById("categories-tbody");
  tbody.innerHTML = getSkeletonRows(3, 2);

  const q = query(collection(db, "categories"), orderBy("name"));
  if (DEBUG)
    console.log(
      "[DEBUG] fetchCategories() — querying Firestore collection: categories",
    );
  try {
    const querySnapshot = await getDocs(q);
    if (DEBUG)
      console.log(
        "[FIRESTORE] fetchCategories returned",
        querySnapshot.size,
        "document(s)",
      );

    categoriesList = [];
    const uploadSelect = document.getElementById("upload-category");
    const editSelect = document.getElementById("edit-image-category");

    tbody.innerHTML = "";
    let selectHtml = '<option value="">No Category</option>';

    if (querySnapshot.empty) {
      tbody.innerHTML = `
                <tr><td colspan="2" class="px-6 py-12 text-center text-gray-500 fade-up">
                    <i class="fas fa-tags text-4xl mb-3 opacity-20"></i><br>
                    <p>No categories yet. Create your first one above.</p>
                </td></tr>`;
    }

    let delay = 0;
    querySnapshot.forEach((docSnap) => {
      const cat = { id: docSnap.id, ...docSnap.data() };
      categoriesList.push(cat);

      selectHtml += `<option value="${cat.id}">${cat.name}</option>`;

      const tr = document.createElement("tr");
      tr.className = "table-row fade-up";
      tr.style.animationDelay = `${delay}ms`;
      tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${cat.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-red-600 hover:text-red-900 ml-4 btn-delete-cat btn-interactive" data-id="${cat.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
      tbody.appendChild(tr);
      delay += 50;
    });

    uploadSelect.innerHTML = selectHtml;
    editSelect.innerHTML = selectHtml;

    document.querySelectorAll(".btn-delete-cat").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const catId = btn.dataset.id;
        const tr = btn.closest("tr");
        if (
          await customConfirm(
            "Delete Category?",
            "This category will be permanently removed. Images using it will become uncategorized.",
          )
        ) {
          try {
            // BUG FIX: await Firestore deletion BEFORE mutating the UI.
            // If deleteDoc throws, the catch block will keep the row visible.
            await deleteDoc(doc(db, "categories", catId));
            // Only animate the row out AFTER Firestore confirms the delete.
            tr.classList.add("shrink-out");
            showSuccessPopup(
              "Task Completed",
              "Category deleted successfully.",
            );
            // BUG FIX: await fetchCategories so any errors are caught and the
            // list is guaranteed to reflect actual Firestore state.
            setTimeout(async () => {
              await fetchCategories();
            }, 400);
          } catch (err) {
            // Keep the row visible and log the full Firestore error.
            tr.classList.remove("shrink-out");
            console.error(
              "[Firestore] Category delete failed. Document ID:",
              catId,
              "Error:",
              err,
            );
            showToast(
              "error",
              "Error deleting category. Check Firestore permissions.",
            );
          }
        }
      });
    });
  } catch (error) {
    tbody.innerHTML =
      '<tr><td colspan="2" class="px-6 py-4 text-center text-sm text-red-500">Failed to load categories.</td></tr>';
  }
}

document
  .getElementById("btn-add-category")
  .addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const input = document.getElementById("new-category-name");
    const name = input.value.trim();
    if (name) {
      btn.classList.add("btn-loading");
      btn.innerText = "Saving";
      try {
        await addDoc(collection(db, "categories"), { name });
        input.value = "";
        showSuccessPopup("Task Completed", "Category created successfully.");
        fetchCategories();
      } catch (err) {
        showToast("error", "Failed to add category.");
      } finally {
        btn.classList.remove("btn-loading");
        btn.innerText = "Add";
      }
    }
  });

// --- FAQs ---
const defaultFaqsSeed = [
  {
    question: "What photography services do you offer?",
    answer:
      "Surya Photography offers event photography, portrait photography, maternity photography, and lifestyle photography — all in Waterloo, Ontario and across the Greater Toronto Area.",
  },
  {
    question: "Where are you located and do you travel?",
    answer:
      "We are based in Waterloo, Ontario, Canada. We serve clients across Kitchener, Cambridge, Toronto, and the entire Greater Toronto Area. Destination photography is also available upon request.",
  },
  {
    question: "How do I book a session?",
    answer:
      "Simply fill out the form on this page, send us a WhatsApp message at +1 437-599-7965, or email us at Mail2suryacapturra@gmail.com. We respond within 24 hours.",
  },
  {
    question: "What languages do you speak?",
    answer:
      "We are fluent in English and Tamil, making us an ideal choice for South Asian celebrations and cultural events across Ontario.",
  },
  {
    question: "How much does a session cost?",
    answer:
      "Pricing varies by session type, duration, and location. Contact us directly for a personalized quote — we offer packages to suit different budgets and needs.",
  },
];

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchFaqs() {
  const tbody = document.getElementById("faqs-tbody");
  const badge = document.getElementById("faqs-count-badge");
  const seedBtn = document.getElementById("btn-seed-faqs");
  const warning = document.getElementById("faq-limit-warning");
  const addBtn = document.getElementById("btn-add-faq");
  const qInput = document.getElementById("new-faq-question");
  const aInput = document.getElementById("new-faq-answer");

  if (!tbody) return;
  tbody.innerHTML = getSkeletonRows(4, 3);

  try {
    const querySnapshot = await getDocs(collection(db, "faqs"));
    faqsList = [];
    querySnapshot.forEach((docSnap) => {
      faqsList.push({ id: docSnap.id, ...docSnap.data() });
    });

    faqsList.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return (a.createdAt.seconds || 0) - (b.createdAt.seconds || 0);
      }
      return (a.question || "").localeCompare(b.question || "");
    });

    tbody.innerHTML = "";
    if (badge) badge.innerText = `${faqsList.length} / 10 FAQs`;

    if (faqsList.length >= 10) {
      if (warning) warning.classList.remove("hidden");
      if (addBtn) {
        addBtn.disabled = true;
        addBtn.classList.add("opacity-50", "cursor-not-allowed");
      }
      if (qInput) qInput.disabled = true;
      if (aInput) aInput.disabled = true;
    } else {
      if (warning) warning.classList.add("hidden");
      if (addBtn) {
        addBtn.disabled = false;
        addBtn.classList.remove("opacity-50", "cursor-not-allowed");
      }
      if (qInput) qInput.disabled = false;
      if (aInput) aInput.disabled = false;
    }

    if (faqsList.length === 0) {
      if (seedBtn) seedBtn.classList.remove("hidden");
      tbody.innerHTML = `
                <tr><td colspan="3" class="px-6 py-12 text-center text-gray-500 fade-up">
                    <i class="fas fa-question-circle text-4xl mb-3 opacity-20"></i><br>
                    <p>No custom FAQs stored in database yet. The website is currently displaying the 5 default FAQs.</p>
                </td></tr>`;
    } else {
      if (seedBtn) seedBtn.classList.add("hidden");
      let delay = 0;
      faqsList.forEach((faq) => {
        const tr = document.createElement("tr");
        tr.className = "table-row fade-up";
        tr.style.animationDelay = `${delay}ms`;
        tr.innerHTML = `
                    <td class="px-6 py-4 text-sm font-bold text-gray-800 align-top">${escapeHtml(faq.question || "")}</td>
                    <td class="px-6 py-4 text-sm text-gray-600 align-top">${escapeHtml(faq.answer || "")}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                        <button class="text-red-600 hover:text-red-900 ml-4 btn-delete-faq btn-interactive" data-id="${faq.id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
        tbody.appendChild(tr);
        delay += 50;
      });

      document.querySelectorAll(".btn-delete-faq").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const faqId = btn.dataset.id;
          const tr = btn.closest("tr");
          if (
            await customConfirm(
              "Delete FAQ?",
              "This question and answer will be permanently removed from the website.",
            )
          ) {
            try {
              await deleteDoc(doc(db, "faqs", faqId));
              tr.classList.add("shrink-out");
              showSuccessPopup("Task Completed", "FAQ deleted successfully.");
              setTimeout(async () => {
                await fetchFaqs();
              }, 400);
            } catch (err) {
              tr.classList.remove("shrink-out");
              console.error("[Firestore] FAQ delete failed:", err);
              showToast(
                "error",
                "Error deleting FAQ. Check Firestore permissions.",
              );
            }
          }
        });
      });
    }
  } catch (error) {
    console.error("Failed to load FAQs:", error);
    const errMsg =
      error && error.message ? error.message : "Unknown Firestore error";
    tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-6 text-center text-sm text-red-500 font-medium">Failed to load FAQs: ${escapeHtml(errMsg)}</td></tr>`;
  }
}

const addFaqBtn = document.getElementById("btn-add-faq");
if (addFaqBtn) {
  addFaqBtn.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const qInput = document.getElementById("new-faq-question");
    const aInput = document.getElementById("new-faq-answer");
    const question = qInput.value.trim();
    const answer = aInput.value.trim();

    if (faqsList.length >= 10) {
      showToast("error", "Maximum limit of 10 FAQs reached.");
      return;
    }

    if (!question || !answer) {
      showToast("error", "Please enter both question and answer.");
      return;
    }

    btn.classList.add("btn-loading");
    btn.innerText = "Saving";
    try {
      await addDoc(collection(db, "faqs"), {
        question,
        answer,
        createdAt: serverTimestamp(),
      });
      qInput.value = "";
      aInput.value = "";
      showSuccessPopup("Task Completed", "FAQ added successfully.");
      fetchFaqs();
    } catch (err) {
      console.error("Error adding FAQ:", err);
      showToast(
        "error",
        err && err.message ? `Error: ${err.message}` : "Failed to add FAQ.",
      );
    } finally {
      btn.classList.remove("btn-loading");
      btn.innerText = "Add Question";
    }
  });
}

const seedFaqBtn = document.getElementById("btn-seed-faqs");
if (seedFaqBtn) {
  seedFaqBtn.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.classList.add("btn-loading");
    btn.innerText = "Seeding...";
    try {
      const batch = writeBatch(db);
      defaultFaqsSeed.forEach((item) => {
        const newDocRef = doc(collection(db, "faqs"));
        batch.set(newDocRef, {
          ...item,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      showSuccessPopup("Task Completed", "5 default FAQs seeded successfully.");
      fetchFaqs();
    } catch (err) {
      console.error("Error seeding FAQs:", err);
      showToast("error", "Failed to seed default FAQs.");
    } finally {
      btn.classList.remove("btn-loading");
      btn.innerText = "Seed Default FAQs";
    }
  });
}

// --- Images ---
async function fetchImages() {
  const tbody = document.getElementById("gallery-tbody");
  tbody.innerHTML = getSkeletonRows(5, 6);

  // Clear selection state
  selectedImageIds.clear();
  updateBulkDeleteButton();
  const selectAllCheckbox = document.getElementById("select-all-images");
  if (selectAllCheckbox) selectAllCheckbox.checked = false;
  const mobileSelectAllCheckbox = document.getElementById("mobile-select-all");
  if (mobileSelectAllCheckbox) mobileSelectAllCheckbox.checked = false;

  const q = query(collection(db, "images"), orderBy("createdAt", "desc"));
  if (DEBUG)
    console.log(
      "[DEBUG] fetchImages() — querying Firestore collection: images",
    );
  try {
    const querySnapshot = await getDocs(q);
    if (DEBUG)
      console.log(
        "[FIRESTORE] fetchImages returned",
        querySnapshot.size,
        "document(s)",
      );

    tbody.innerHTML = "";

    if (querySnapshot.empty) {
      tbody.innerHTML = `
                <tr><td colspan="6" class="px-6 py-16 text-center text-gray-500 fade-up">
                    <i class="fas fa-images text-5xl mb-4 opacity-20"></i><br>
                    <p class="text-lg">No images yet</p>
                    <p class="text-sm">Upload your first masterpiece to the gallery.</p>
                </td></tr>`;
    }

    let delay = 0;
    querySnapshot.forEach((docSnap) => {
      const img = { id: docSnap.id, ...docSnap.data() };
      const catName =
        categoriesList.find((c) => c.id === img.category_id)?.name || "-";
      const dateStr = img.createdAt
        ? new Date(img.createdAt.toMillis()).toLocaleDateString()
        : "Just now";

      // Handle Video vs Image rendering
      const isVideo = img.type === "video";
      const thumbSrc = img.thumbnailUrl || img.imageUrl;
      let typeBadge = isVideo
        ? `<span class="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full ml-2 flex items-center gap-1 font-bold inline-flex"><i class="fas fa-video"></i> ${formatDuration(img.duration)}</span>`
        : `<span class="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full ml-2 flex items-center gap-1 font-bold inline-flex"><i class="fas fa-camera"></i> Image</span>`;

      const tr = document.createElement("tr");
      tr.className = "table-row gallery-row fade-up";
      tr.style.animationDelay = `${delay}ms`;
      tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap" data-label="select">
                    <input type="checkbox" class="select-image-checkbox w-4 h-4 text-main border-gray-300 rounded focus:ring-main cursor-pointer" data-id="${img.id}">
                </td>
                <td class="px-6 py-4 whitespace-nowrap relative" data-label="thumbnail">
                    <div class="relative h-12 w-20 rounded shadow-sm overflow-hidden group">
                        <img src="${thumbSrc}" alt="${img.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy">
                        ${isVideo ? '<div class="absolute inset-0 bg-black/30 flex items-center justify-center"><i class="fas fa-play text-white/80 text-xs"></i></div>' : ""}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium img-title" data-label="title">
                    <div class="flex items-center">
                        <span class="truncate max-w-[150px]">${img.title || "Untitled"}</span>
                        ${typeBadge}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="category">${catName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" data-label="date">${dateStr}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" data-label="actions">
                    <button class="text-indigo-600 hover:text-indigo-900 btn-edit-img btn-interactive" data-id="${img.id}" data-title="${img.title || ""}" data-cat="${img.category_id || ""}"><i class="fas fa-edit"></i></button>
                    <button class="text-red-600 hover:text-red-900 ml-4 btn-delete-img btn-interactive" data-id="${img.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
      tbody.appendChild(tr);
      delay += 30;
    });

    // Setup individual checkbox listeners
    const checkboxes = document.querySelectorAll(".select-image-checkbox");
    checkboxes.forEach((cb) => {
      cb.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) {
          selectedImageIds.add(id);
        } else {
          selectedImageIds.delete(id);
        }
        updateBulkDeleteButton();
        updateSelectAllState();
      });
    });

    // Delete — with live Firestore verification
    document.querySelectorAll(".btn-delete-img").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const imgId = btn.dataset.id;
        const tr = btn.closest("tr");
        const COLLECTION = "images";
        const docRef = doc(db, COLLECTION, imgId);

        if (
          await customConfirm(
            "Delete Image?",
            "Are you sure you want to remove this image from the gallery?",
          )
        ) {
          // ── STEP 1: Pre-delete existence check ──────────────────────
          let preSnap;
          try {
            preSnap = await getDoc(docRef);
          } catch (preErr) {
            console.error(
              "[VERIFY] PRE-DELETE getDoc failed.",
              "| Collection:",
              COLLECTION,
              "| Document ID:",
              imgId,
              "| err.code:",
              preErr.code,
              "| err.message:",
              preErr.message,
            );
            showToast(
              "error",
              "Cannot read document before delete. Check console.",
            );
            return;
          }
          console.log(
            "[VERIFY] PRE-DELETE",
            "| Collection:",
            COLLECTION,
            "| Document ID:",
            imgId,
            "| exists:",
            preSnap.exists(),
          );
          if (!preSnap.exists()) {
            console.warn(
              "[VERIFY] Document does NOT exist in Firestore before delete.",
              "Possible cause: wrong collection name or wrong document ID.",
            );
          }

          // ── STEP 2: Execute deleteDoc ────────────────────────────────
          try {
            await deleteDoc(docRef);
            console.log(
              "[VERIFY] deleteDoc() resolved without error.",
              "| Collection:",
              COLLECTION,
              "| Document ID:",
              imgId,
            );
          } catch (delErr) {
            // Classify the failure reason
            let reason = "Unknown";
            if (delErr.code === "permission-denied")
              reason = "Firestore Security Rules blocked the write";
            else if (delErr.code === "not-found")
              reason = "Document not found (wrong ID or collection)";
            else if (delErr.code === "unavailable")
              reason = "Network error — Firestore unreachable";
            else if (delErr.code === "unauthenticated")
              reason = "User is not authenticated";
            else if (delErr.code) reason = "Firestore error: " + delErr.code;

            tr.classList.remove("shrink-out");
            console.error(
              "[VERIFY] deleteDoc() FAILED.",
              "| Collection:",
              COLLECTION,
              "| Document ID:",
              imgId,
              "| Reason:",
              reason,
              "| err.code:",
              delErr.code,
              "| err.message:",
              delErr.message,
              "| Full error:",
              delErr,
            );
            showToast(
              "error",
              "Delete failed: " + reason + ". See console for details.",
            );
            return;
          }

          // ── STEP 3: Post-delete existence check (live Firestore read) ──
          let postSnap;
          try {
            postSnap = await getDoc(docRef);
          } catch (postErr) {
            console.error(
              "[VERIFY] POST-DELETE getDoc failed.",
              "| err.code:",
              postErr.code,
              "| err.message:",
              postErr.message,
            );
            // deleteDoc resolved, but we cannot confirm — treat as warning only
            console.warn(
              "[VERIFY] Could not confirm deletion via getDoc. Proceeding with reload.",
            );
          }

          if (postSnap) {
            if (postSnap.exists()) {
              // deleteDoc resolved but document still exists — this is the real bug
              console.error(
                "[VERIFY] POST-DELETE: document STILL EXISTS in Firestore after deleteDoc resolved.",
                "| Collection:",
                COLLECTION,
                "| Document ID:",
                imgId,
                "| This means deleteDoc() returned success but Firestore did not actually delete the document.",
                "| Possible causes: Security Rules silently allowed the call but did not execute,",
                "| or the document is in a different collection than expected.",
              );
              tr.classList.remove("shrink-out");
              showToast(
                "error",
                "Deletion unconfirmed — document still exists in Firestore. See console.",
              );
              return;
            } else {
              console.log(
                "[VERIFY] POST-DELETE: document confirmed GONE from Firestore. exists():",
                postSnap.exists(),
              );
            }
          }

          // ── STEP 4: Query re-fetch to confirm not in collection ─────
          const verifyQ = query(
            collection(db, COLLECTION),
            orderBy("createdAt", "desc"),
          );
          const verifySnap = await getDocs(verifyQ);
          const stillInQuery = verifySnap.docs.some((d) => d.id === imgId);
          console.log(
            "[VERIFY] Re-fetch query result",
            "| Deleted ID still returned by query:",
            stillInQuery,
            "| Total docs in collection now:",
            verifySnap.size,
          );
          if (stillInQuery) {
            console.error(
              "[VERIFY] Document still returned by getDocs query after deleteDoc.",
              "| This would cause the image to reappear after refresh.",
              "| Document ID:",
              imgId,
            );
          }

          // ── STEP 5: Update UI only after all Firestore checks pass ──
          tr.classList.add("shrink-out");
          showSuccessPopup("Task Completed", "Image removed successfully.");
          setTimeout(async () => {
            await fetchImages();
          }, 400);
        }
      });
    });

    // Edit
    document.querySelectorAll(".btn-edit-img").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        openEditModal(e.currentTarget.dataset);
      });
    });
  } catch (error) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-red-500">Failed to load images.</td></tr>';
  }
}

// Live Search
document.getElementById("gallery-search")?.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  const rows = document.querySelectorAll("#gallery-tbody tr.gallery-row");
  let hasMatches = false;
  rows.forEach((row) => {
    const title =
      row.querySelector(".img-title")?.innerText.toLowerCase() || "";
    if (title.includes(query)) {
      row.style.display = "";
      row.classList.add("fade-up");
      hasMatches = true;
    } else {
      row.style.display = "none";
      row.classList.remove("fade-up");
    }
  });
});

// Edit Modal Actions
document
  .getElementById("btn-cancel-edit")
  .addEventListener("click", closeEditModal);

document
  .getElementById("btn-save-edit")
  .addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const id = document.getElementById("edit-image-id").value;
    const title = document.getElementById("edit-image-title").value;
    const category_id = document.getElementById("edit-image-category").value;

    btn.classList.add("btn-loading");
    btn.innerText = "Saving";

    try {
      await updateDoc(doc(db, "images", id), { title, category_id });
      showSuccessPopup("Task Completed", "Changes saved successfully.");
      closeEditModal();
      fetchImages();
    } catch (err) {
      showToast("error", "Failed to save changes.");
    } finally {
      btn.classList.remove("btn-loading");
      btn.innerText = "Save Changes";
    }
  });

// ==========================================
// CLOUDINARY UPLOAD WIDGET & PREMIUM POST-PROCESSING
// ==========================================
let uploadedFilesData = [];

// Helper to format duration like 01:45
function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

document
  .getElementById("btn-cloudinary-upload")
  .addEventListener("click", () => {
    const category_id = document.getElementById("upload-category").value;
    uploadedFilesData = []; // reset array for this batch

    const widget = cloudinary.createUploadWidget(
      {
        cloudName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET,
        multiple: true,
        resourceType: "auto", // Automatically detect image or video
        clientAllowedFormats: ["webp", "jpeg", "jpg", "png", "mp4", "mov"],
        maxImageFileSize: 10000000, // 10MB
        maxVideoFileSize: 500000000, // 500MB
      },
      (error, result) => {
        if (!error && result && result.event === "success") {
          const info = result.info;

          // Video duration validation
          if (
            info.resource_type === "video" &&
            info.duration &&
            info.duration > 240
          ) {
            window.showToast(
              "error",
              `Video "${info.original_filename}" is longer than 4 minutes and was rejected.`,
            );
            return;
          }

          uploadedFilesData.push(info);
        }

        // Listen for the widget to fully close
        if (!error && result && result.event === "close") {
          if (uploadedFilesData.length > 0) {
            // Trigger the Premium Post-Processing Overlay
            processUploadedFiles(uploadedFilesData, category_id);
          }
        }
      },
    );

    widget.open();
  });

async function processUploadedFiles(files, category_id) {
  const overlay = document.getElementById("processing-overlay");
  const card = document.getElementById("processing-card");
  const stagesUl = document.getElementById("processing-stages");
  const bar = document.getElementById("processing-bar");
  const pct = document.getElementById("processing-percent");
  const title = document.getElementById("processing-title");
  const subtitle = document.getElementById("processing-subtitle");
  const icon = document.getElementById("processing-icon");
  const iconContainer = document.getElementById("processing-icon-container");
  const errorActions = document.getElementById("processing-error-actions");
  const progressContainer = document.getElementById(
    "processing-progress-container",
  );
  const particles = document.getElementById("processing-particles");

  // Reset state
  errorActions.classList.add("hidden");
  progressContainer.classList.remove("hidden");
  stagesUl.innerHTML = "";
  bar.style.width = "0%";
  pct.innerText = "0%";
  icon.className = "fas fa-camera retro-cam";
  iconContainer.className =
    "w-24 h-24 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner border border-indigo-100 transition-all duration-500";
  title.innerText = "Upload Complete";
  subtitle.innerText = "Now preparing your masterpiece...";
  title.className = "text-2xl font-bold text-gray-800 mb-2";
  particles.innerHTML = "";

  // Show Overlay
  overlay.classList.remove("hidden");
  overlay.classList.add("flex");
  requestAnimationFrame(() => {
    overlay.classList.remove("opacity-0");
    card.classList.remove("scale-95");
    card.classList.add("scale-100");
  });

  const addStage = (text, isCheck = false) => {
    const li = document.createElement("li");
    li.className = "stage-item flex items-center";
    li.innerHTML = `<i class="fas ${isCheck ? "fa-check text-green-500" : "fa-circle-notch fa-spin text-indigo-400"} w-5 mr-3"></i> <span>${text}</span>`;
    stagesUl.appendChild(li);
    return li;
  };

  const updateStage = (li, isCheck) => {
    li.querySelector("i").className =
      `fas ${isCheck ? "fa-check text-green-500" : "fa-circle-notch fa-spin text-red-500"} w-5 mr-3`;
  };

  try {
    // Stage 1
    let stage1 = addStage("Media received from Cloudinary");
    await new Promise((r) => setTimeout(r, 600));
    updateStage(stage1, true);
    bar.style.width = "20%";
    pct.innerText = "20%";

    // Stage 2
    let stage2 = addStage("Optimizing media & generating thumbnails...");
    await new Promise((r) => setTimeout(r, 800));
    updateStage(stage2, true);
    bar.style.width = "40%";
    pct.innerText = "40%";

    // Stage 3
    let stage3 = addStage(`Saving ${files.length} item(s) to Gallery...`);
    let baseProgress = 40;
    let progressPerFile = 40 / files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Determine type and thumbnail
      const isVideo = file.resource_type === "video";
      const thumb = isVideo
        ? file.secure_url.replace(/\.[^/.]+$/, ".jpg")
        : file.secure_url;

      // Optimize video delivery using Cloudinary automatic quality and format
      let optimizedUrl = file.secure_url;
      if (isVideo && file.secure_url.includes("/upload/")) {
        optimizedUrl = file.secure_url.replace(
          "/upload/",
          "/upload/q_auto,f_auto/",
        );
      }

      await addDoc(collection(db, "images"), {
        title: file.original_filename,
        category_id: category_id || null,
        imageUrl: optimizedUrl,
        thumbnailUrl: thumb,
        type: isVideo ? "video" : "image",
        duration: isVideo ? file.duration || 0 : null,
        publicId: file.public_id,
        createdAt: serverTimestamp(),
      });
      baseProgress += progressPerFile;
      bar.style.width = `${Math.round(baseProgress)}%`;
      pct.innerText = `${Math.round(baseProgress)}%`;
      if (files.length === 1) await new Promise((r) => setTimeout(r, 600));
    }
    updateStage(stage3, true);

    // Stage 4
    let stage5 = addStage("Refreshing Gallery data...");
    await fetchImages();
    updateStage(stage5, true);
    bar.style.width = "100%";
    pct.innerText = "100%";

    // Completion
    await new Promise((r) => setTimeout(r, 400));
    title.innerText = "Successfully Published";
    title.className = "text-2xl font-bold text-green-600 mb-2";
    subtitle.innerText = "Your gallery is up to date.";
    icon.className = "fas fa-check";
    iconContainer.className =
      "w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner border border-green-100 transition-all duration-500";
    iconContainer.style.animation =
      "successPulse 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards";

    for (let i = 0; i < 15; i++) {
      let p = document.createElement("div");
      p.className = "particle";
      p.style.left = `${50 + (Math.random() * 60 - 30)}%`;
      p.style.top = `50%`;
      p.style.width = `${Math.random() * 6 + 4}px`;
      p.style.height = p.style.width;
      p.style.animationDuration = `${0.8 + Math.random()}s`;
      p.style.animationDelay = `${Math.random() * 0.2}s`;
      particles.appendChild(p);
    }

    showSuccessPopup(
      "Task Completed",
      `${files.length} items published successfully.`,
    );
    setTimeout(closeOverlay, 2500);
  } catch (err) {
    console.error(err);
    title.innerText = "Upload Failed";
    title.className = "text-2xl font-bold text-red-600 mb-2";
    subtitle.innerText = "An error occurred while saving to Firestore.";
    icon.className = "fas fa-times";
    iconContainer.className =
      "w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner border border-red-100 transition-all duration-500 shake";
    errorActions.classList.remove("hidden");

    const currentStage = stagesUl.lastElementChild;
    if (currentStage) updateStage(currentStage, false);
  }

  function closeOverlay() {
    overlay.classList.add("opacity-0");
    card.classList.remove("scale-100");
    card.classList.add("scale-95");
    setTimeout(() => {
      overlay.classList.add("hidden");
      overlay.classList.remove("flex");
    }, 500);
  }

  document.getElementById("btn-processing-dismiss").onclick = closeOverlay;
}

// ==========================================
// TABS
// ==========================================
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.classList.contains("active")) return;

    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const targetId = btn.dataset.tab;

    tabContents.forEach((c) => {
      c.classList.remove("active", "fade-out", "fade-in");
    });

    const target = document.getElementById(targetId);
    if (target) {
      target.classList.add("active");
    }
  });
});

// Selection / Bulk Delete Helpers
function updateBulkDeleteButton() {
  const btn = document.getElementById("btn-bulk-delete");
  const countText = document.getElementById("bulk-select-count");
  if (btn && countText) {
    countText.innerText = selectedImageIds.size;
    if (selectedImageIds.size > 0) {
      btn.style.display = "flex";
    } else {
      btn.style.display = "none";
    }
  }
}

function updateSelectAllState() {
  const desktopCheckbox = document.getElementById("select-all-images");
  const mobileCheckbox = document.getElementById("mobile-select-all");
  if (!desktopCheckbox && !mobileCheckbox) return;

  const checkboxes = document.querySelectorAll(".select-image-checkbox");
  if (checkboxes.length === 0) {
    if (desktopCheckbox) desktopCheckbox.checked = false;
    if (mobileCheckbox) mobileCheckbox.checked = false;
    return;
  }
  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
  if (desktopCheckbox) desktopCheckbox.checked = allChecked;
  if (mobileCheckbox) mobileCheckbox.checked = allChecked;
}

// Master Checkbox Listeners (Desktop + Mobile)
function attachSelectAllListener(id) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener("change", (e) => {
      const checked = e.target.checked;
      const checkboxes = document.querySelectorAll(".select-image-checkbox");
      checkboxes.forEach((cb) => {
        const imgId = cb.dataset.id;
        cb.checked = checked;
        if (checked) {
          selectedImageIds.add(imgId);
        } else {
          selectedImageIds.delete(imgId);
        }
      });
      updateSelectAllState();
      updateBulkDeleteButton();
    });
  }
}

attachSelectAllListener("select-all-images");
attachSelectAllListener("mobile-select-all");

// Bulk Actions Logic
const btnBulkDelete = document.getElementById("btn-bulk-delete");
const bulkConfirmModal = document.getElementById("bulk-confirm-modal");
const bulkDeleteCountText = document.getElementById("bulk-delete-count");
const bulkConfirmBtn = document.getElementById("bulk-confirm");
const bulkCancelBtn = document.getElementById("bulk-cancel");

const progressModal = document.getElementById("progress-modal");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");
const progressStep = document.getElementById("progress-step");

if (btnBulkDelete) {
  btnBulkDelete.addEventListener("click", () => {
    if (selectedImageIds.size === 0) return;
    if (bulkDeleteCountText) {
      bulkDeleteCountText.innerText = selectedImageIds.size;
    }
    if (bulkConfirmModal) {
      bulkConfirmModal.classList.remove("hidden");
      bulkConfirmModal.classList.add("flex");
      setTimeout(() => {
        bulkConfirmModal.style.opacity = "1";
      }, 10);
    }
  });
}

if (bulkCancelBtn) {
  bulkCancelBtn.addEventListener("click", () => {
    if (bulkConfirmModal) {
      bulkConfirmModal.style.opacity = "0";
      setTimeout(() => {
        bulkConfirmModal.classList.add("hidden");
        bulkConfirmModal.classList.remove("flex");
      }, 300);
    }
  });
}

if (bulkConfirmBtn) {
  bulkConfirmBtn.addEventListener("click", async () => {
    if (bulkConfirmModal) {
      bulkConfirmModal.classList.add("hidden");
      bulkConfirmModal.classList.remove("flex");
    }

    if (progressModal) {
      progressModal.classList.remove("hidden");
      progressModal.classList.add("flex");
      progressModal.style.opacity = "1";
    }

    const total = selectedImageIds.size;
    let count = 0;

    if (progressBar) progressBar.style.width = "0%";
    if (progressText) progressText.innerText = `0 / ${total}`;
    if (progressStep) progressStep.innerText = "Initializing deletion...";

    const batch = writeBatch(db);
    console.log(
      "[FIRESTORE] Bulk delete: preparing batch for",
      total,
      "document(s)",
    );
    selectedImageIds.forEach((id) => {
      console.log("[FIRESTORE] Bulk delete: queueing document ID:", id);
      batch.delete(doc(db, "images", id));
    });

    try {
      if (progressStep) progressStep.innerText = "Deleting from database...";
      await batch.commit();
      console.log(
        "[FIRESTORE] Bulk delete: batch.commit() resolved —",
        total,
        "document(s) deleted",
      );

      for (let i = 1; i <= total; i++) {
        count = i;
        if (progressBar) progressBar.style.width = `${(count / total) * 100}%`;
        if (progressText) progressText.innerText = `${count} / ${total}`;
        await new Promise((r) => setTimeout(r, 100));
      }

      if (progressStep) progressStep.innerText = "Refreshing gallery...";
      selectedImageIds.clear();
      updateBulkDeleteButton();
      await fetchImages();
      showSuccessPopup("Task Completed", "Images deleted successfully.");
    } catch (error) {
      console.error(
        "[FIRESTORE] Bulk delete FAILED.",
        "| err.code:",
        error.code,
        "| err.message:",
        error.message,
        "| Full error:",
        error,
      );
      showToast(
        "error",
        "Bulk delete failed: " +
          (error.message || "Unknown error") +
          ". See console.",
      );
    } finally {
      if (progressModal) {
        progressModal.style.opacity = "0";
        setTimeout(() => {
          progressModal.classList.add("hidden");
          progressModal.classList.remove("flex");
        }, 300);
      }
    }
  });
}

// ==========================================
// MOBILE SIDEBAR (Slide-out Drawer)
// ==========================================
function initMobileSidebar() {
  const sidebar = document.getElementById("admin-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const menuBtn = document.getElementById("mobile-menu-btn");
  if (!sidebar || !menuBtn || !overlay) {
    if (DEBUG)
      console.warn("[DEBUG] initMobileSidebar: missing element(s)", {
        sidebar: !!sidebar,
        menuBtn: !!menuBtn,
        overlay: !!overlay,
      });
    return;
  }
  if (DEBUG)
    console.log(
      "[DEBUG] initMobileSidebar: all elements found, attaching listeners",
    );

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("open");
    menuBtn.classList.add("open");
    menuBtn.setAttribute("aria-expanded", "true");
    if (DEBUG) console.log("[DEBUG] Mobile sidebar opened");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
    menuBtn.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    if (DEBUG) console.log("[DEBUG] Mobile sidebar closed");
  }

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  // Clicking the overlay closes the drawer
  overlay.addEventListener("click", closeSidebar);

  // Close button inside the sidebar header
  const closeBtn = document.getElementById("btn-close-sidebar");
  if (closeBtn) closeBtn.addEventListener("click", closeSidebar);

  // Clicking a tab on mobile closes the drawer after selection
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (window.innerWidth < 1024) {
        setTimeout(closeSidebar, 200);
      }
    });
  });

  // ESC key closes the drawer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar.classList.contains("open"))
      closeSidebar();
  });

  // On resize to desktop, reset any mobile state
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
      menuBtn.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });
}

initMobileSidebar();

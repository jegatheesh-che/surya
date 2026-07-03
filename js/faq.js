import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyADbXVx3b_DtClpoRGcy75e_Iq9bI8FCgI",
  authDomain: "project2-f50fa.firebaseapp.com",
  projectId: "project2-f50fa",
  storageBucket: "project2-f50fa.firebasestorage.app",
  messagingSenderId: "145748902606",
  appId: "1:145748902606:web:b2144e287ef6668a29469f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const defaultFaqs = [
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
      "Simply fill out the form on this page, send us a WhatsApp message at <a href='https://wa.me/14375997965' class='text-main hover:underline'>+1 437-599-7965</a>, or email us at <a href='mailto:Mail2suryacapturra@gmail.com' class='text-main hover:underline'>Mail2suryacapturra@gmail.com</a>. We respond within 24 hours.",
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

document.addEventListener("DOMContentLoaded", () => {
  loadDynamicFaqs();
});

async function loadDynamicFaqs() {
  const faqContainer = document.getElementById("faq-list");
  if (!faqContainer) return;

  let faqsToRender = [];
  try {
    const querySnapshot = await getDocs(collection(db, "faqs"));
    querySnapshot.forEach((docSnap) => {
      faqsToRender.push(docSnap.data());
    });

    // Sort by createdAt ascending or question
    faqsToRender.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return (a.createdAt.seconds || 0) - (b.createdAt.seconds || 0);
      }
      return (a.question || "").localeCompare(b.question || "");
    });

    // Enforce limit of 10
    if (faqsToRender.length > 10) {
      faqsToRender = faqsToRender.slice(0, 10);
    }
  } catch (error) {
    console.error("Failed to load FAQs from Firestore, using default:", error);
  }

  if (faqsToRender.length === 0) {
    faqsToRender = defaultFaqs;
  }

  // Render HTML Accordions
  faqContainer.innerHTML = "";
  faqsToRender.forEach((faq) => {
    const details = document.createElement("details");
    details.className = "group py-6 cursor-pointer";
    details.setAttribute("name", "faq-accordion");

    details.innerHTML = `
            <summary class="font-main text-sm uppercase tracking-widest text-dark list-none flex justify-between items-center">
                <span>${faq.question || ""}</span>
                <i class="fas fa-plus text-main text-xs group-open:hidden" aria-hidden="true"></i>
                <i class="fas fa-minus text-main text-xs hidden group-open:block" aria-hidden="true"></i>
            </summary>
            <p class="font-main text-sm text-dark/70 leading-relaxed mt-4">
                ${faq.answer || ""}
            </p>
        `;
    faqContainer.appendChild(details);
  });

  updateFaqSchema(faqsToRender);
}

function updateFaqSchema(faqs) {
  const stripHtml = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html || "";
    return tmp.textContent || tmp.innerText || "";
  };

  const schemaData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: stripHtml(f.question),
      acceptedAnswer: {
        "@type": "Answer",
        text: stripHtml(f.answer),
      },
    })),
  };

  let existingScript = document.querySelector(
    'script[type="application/ld+json"][data-schema="faq"]',
  );
  if (!existingScript) {
    existingScript = document.createElement("script");
    existingScript.type = "application/ld+json";
    existingScript.setAttribute("data-schema", "faq");
    document.head.appendChild(existingScript);
  }
  existingScript.textContent = JSON.stringify(schemaData, null, 4);
}

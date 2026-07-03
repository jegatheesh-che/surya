document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const feedback = document.getElementById("form-feedback");
  const WHATSAPP_NUMBER = "14375997965";

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      // 1. Validate Form
      if (!validateForm()) {
        return;
      }

      // 2. Build WhatsApp Message
      const messageText = buildWhatsAppMessage();

      // 3. Open WhatsApp
      openWhatsApp(messageText);

      // Clean up UI state if returning
      feedback.classList.add("hidden");
    });
  }

  /**
   * Validates required form fields.
   * @returns {boolean} True if valid, False otherwise.
   */
  function validateForm() {
    const name = document.getElementById("user_name").value.trim();
    const email = document.getElementById("user_email").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!name || !email || !subject || !message) {
      showFeedback("error", "Please fill in all required fields.");
      return false;
    }

    // Simple Email Regex Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showFeedback("error", "Please enter a valid email address.");
      return false;
    }

    return true;
  }

  /**
   * Constructs the formatted WhatsApp message string.
   * @returns {string} The raw message string (unencoded).
   */
  function buildWhatsAppMessage() {
    const name = document.getElementById("user_name").value.trim();
    const email = document.getElementById("user_email").value.trim();
    const phone =
      document.getElementById("user_phone").value.trim() || "Not provided";
    const subject = document.getElementById("subject").value.trim();
    const message = document.getElementById("message").value.trim();

    return `📸 *New Photography Booking Inquiry*

👤 Name:
${name}

📞 Phone:
${phone}

📧 Email:
${email}

🎯 Subject / Event Type:
${subject}

💬 Message:
${message}`;
  }

  /**
   * URL encodes the message and opens WhatsApp in a new tab.
   * @param {string} text The raw message text.
   */
  function openWhatsApp(text) {
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedText}`;
    window.open(whatsappUrl, "_blank");
  }

  /**
   * Shows a validation feedback message.
   * @param {string} type 'error' or 'success'
   * @param {string} message The text to display
   */
  function showFeedback(type, message) {
    if (!feedback) return;

    feedback.innerText = message;
    feedback.classList.remove(
      "hidden",
      "border-red-500",
      "text-red-600",
      "bg-red-50",
      "border-green-500",
      "text-green-600",
      "bg-green-50",
    );

    if (type === "error") {
      feedback.classList.add("border-red-500", "text-red-600", "bg-red-50");
    } else {
      feedback.classList.add(
        "border-green-500",
        "text-green-600",
        "bg-green-50",
      );
    }
  }
});

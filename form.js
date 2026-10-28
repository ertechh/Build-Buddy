/* ============================================
   Build Buddy — Multi-step enquiry form
   ============================================ */

(function () {
  "use strict";

  const form = document.getElementById("enquiry-form");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll(".form-step"));
  const totalSteps = steps.length;
  const progressBar = document.getElementById("progress-bar");
  const stepLabel = document.getElementById("step-label");
  const successScreen = document.getElementById("form-success");
  const submitBtn = document.getElementById("submit-btn");
  const draftKey = "buildbuddy_enquiry_draft";

  let current = 0;

  /* ---------- Progress ---------- */
  function updateProgress() {
    const pct = ((current + 1) / totalSteps) * 100;
    progressBar.style.width = pct + "%";
    stepLabel.textContent =
      String(current + 1).padStart(2, "0") +
      " / " +
      String(totalSteps).padStart(2, "0");
  }

  /* ---------- Show step ---------- */
  function showStep(index) {
    steps[current].classList.remove("active");
    current = index;
    steps[current].classList.add("active");
    updateProgress();
    window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
  }

  /* ---------- Validation ---------- */
  function validateStep(step) {
    let valid = true;
    const radioNames = new Set();

    step.querySelectorAll("input[required], textarea[required]").forEach((input) => {
      if (input.type === "radio") {
        radioNames.add(input.name);
        return;
      }
      if (!input.value.trim()) {
        markInvalid(input);
        valid = false;
      } else if (
        input.type === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)
      ) {
        markInvalid(input);
        valid = false;
      } else {
        clearInvalid(input);
      }
    });

    radioNames.forEach((name) => {
      const checked = step.querySelector(
        'input[name="' + name + '"]:checked'
      );
      const first = step.querySelector('input[name="' + name + '"]');
      const error = first
        ? first.closest(".form-step").querySelector(".error")
        : null;
      if (!checked) {
        valid = false;
        if (error) error.style.display = "block";
      } else if (error) {
        error.style.display = "none";
      }
    });

    return valid;
  }

  function markInvalid(input) {
    const field = input.closest(".field");
    if (field) field.classList.add("invalid");
  }

  function clearInvalid(input) {
    const field = input.closest(".field");
    if (field) field.classList.remove("invalid");
  }

  /* ---------- Change events ---------- */
  form.addEventListener("change", (e) => {
    if (e.target.type === "radio") {
      const error = e.target
        .closest(".form-step")
        .querySelector(".error");
      if (error) error.style.display = "none";
    }
    if (e.target.name === "payment") {
      const followup = document.getElementById("payment-followup");
      const show = [
        "Yes — full checkout on site",
        "Yes — simple pay button",
        "Maybe — discuss options",
      ].includes(e.target.value);
      followup.style.display = show ? "block" : "none";
    }
    saveDraft();
  });

  /* ---------- Next / Back (delegated) ---------- */
  form.addEventListener("click", (e) => {
    const nextBtn = e.target.closest("[data-next]");
    const backBtn = e.target.closest("[data-back]");

    if (nextBtn) {
      e.preventDefault();
      const ok = validateStep(steps[current]);
      if (ok && current < totalSteps - 1) {
        showStep(current + 1);
      }
      return;
    }

    if (backBtn) {
      e.preventDefault();
      if (current > 0) showStep(current - 1);
    }
  });

  /* ---------- Draft ---------- */
  function saveDraft() {
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (data[key]) {
        if (!Array.isArray(data[key])) data[key] = [data[key]];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });
    try {
      localStorage.setItem(draftKey, JSON.stringify(data));
    } catch (err) {}
  }

  function restoreDraft() {
    let raw;
    try {
      raw = localStorage.getItem(draftKey);
    } catch (err) {
      return;
    }
    if (!raw) return;

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return;
    }

    Object.keys(data).forEach((key) => {
      const values = Array.isArray(data[key]) ? data[key] : [data[key]];
      values.forEach((value) => {
        const inputs = form.querySelectorAll('[name="' + key + '"]');
        inputs.forEach((input) => {
          if (
            (input.type === "radio" || input.type === "checkbox") &&
            input.value === value
          ) {
            input.checked = true;
          } else if (
            input.type !== "radio" &&
            input.type !== "checkbox"
          ) {
            input.value = value;
          }
        });
      });
    });
  }

  /* ---------- Submit ---------- */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const honeypot = form.querySelector('[name="website"]');
    if (honeypot && honeypot.value) return;

    if (!validateStep(steps[current])) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    const endpoint = "https://formspree.io/f/mgaaydak";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Formspree responded:", res.status, body);
        throw new Error(body.error || "Submission failed");
      }

      form
        .querySelectorAll(".form-step")
        .forEach((s) => s.classList.remove("active"));
      document.querySelector(".form-progress").style.display = "none";
      successScreen.classList.add("active");
      try {
        localStorage.removeItem(draftKey);
      } catch (err) {}
      window.scrollTo({ top: form.offsetTop - 100, behavior: "smooth" });
    } catch (err) {
      console.error("Formspree error:", err);
      submitBtn.disabled = false;
      submitBtn.textContent = "Send my enquiry";
      alert(
        "Something went wrong sending your enquiry. Please try again, or email hello@buildbuddy.example directly."
      );
    }
  });

  /* ---------- Init ---------- */
  restoreDraft();
  updateProgress();

  const paymentChecked = form.querySelector('input[name="payment"]:checked');
  if (paymentChecked) {
    const followup = document.getElementById("payment-followup");
    const show = [
      "Yes — full checkout on site",
      "Yes — simple pay button",
      "Maybe — discuss options",
    ].includes(paymentChecked.value);
    followup.style.display = show ? "block" : "none";
  }
})();
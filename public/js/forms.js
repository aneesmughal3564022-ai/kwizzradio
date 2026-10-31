// KWIZZ Radio Form Submissions (Anti-Spam & AJAX Feedback)

(function () {
  function initForms() {
    // 1. Initialize Anti-Bot Timestamp Tokens
    const renderTime = Date.now();
    const reqRendered = document.getElementById('req_rendered_at');
    const contactRendered = document.getElementById('contact_rendered_at');
    if (reqRendered) reqRendered.value = renderTime;
    if (contactRendered) contactRendered.value = renderTime;

    // 2. Song Request Form Handler
    const requestForm = document.getElementById('song-request-form');
    if (requestForm && !requestForm.dataset.initialized) {
      requestForm.dataset.initialized = 'true';
      requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('request-submit-btn');
        const feedback = document.getElementById('request-feedback');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');

        // Reset UI
        feedback.className = 'hidden p-4 rounded-xl text-xs font-semibold';
        feedback.textContent = '';
        submitBtn.disabled = true;
        if (btnText) btnText.textContent = 'Submitting...';
        if (btnSpinner) btnSpinner.classList.remove('hidden');

        const formData = new FormData(requestForm);
        const body = Object.fromEntries(formData.entries());

        try {
          const res = await fetch('/api/requests', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(body)
          });

          const data = await res.json();

          if (res.ok && data.success) {
            feedback.className = 'p-4 rounded-xl text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30';
            feedback.textContent = data.message || 'Big up! Song request sent to the studio.';
            requestForm.reset();
            // Re-arm render timestamp for next request
            if (reqRendered) reqRendered.value = Date.now();

            if (window.kwizzAnalytics) {
              window.kwizzAnalytics.track('request_submitted', { artist: body.artist, song: body.songTitle });
            }
          } else {
            feedback.className = 'p-4 rounded-xl text-xs font-semibold bg-red-950/80 text-red-400 border border-red-500/30';
            feedback.textContent = data.error || (data.details && data.details[0]?.message) || 'Failed to submit request. Please try again.';
          }
        } catch (err) {
          feedback.className = 'p-4 rounded-xl text-xs font-semibold bg-red-950/80 text-red-400 border border-red-500/30';
          feedback.textContent = 'Network error while submitting. Please check your connection.';
        } finally {
          submitBtn.disabled = false;
          if (btnText) btnText.textContent = 'Send Song Request';
          if (btnSpinner) btnSpinner.classList.add('hidden');
        }
      });
    }

    // 3. Contact Station Form Handler
    const contactForm = document.getElementById('contact-station-form');
    if (contactForm && !contactForm.dataset.initialized) {
      contactForm.dataset.initialized = 'true';
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('contact-submit-btn');
        const feedback = document.getElementById('contact-feedback');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnSpinner = submitBtn.querySelector('.btn-spinner');

        feedback.className = 'hidden p-4 rounded-xl text-xs font-semibold';
        feedback.textContent = '';
        submitBtn.disabled = true;
        if (btnText) btnText.textContent = 'Sending...';
        if (btnSpinner) btnSpinner.classList.remove('hidden');

        const formData = new FormData(contactForm);
        const body = Object.fromEntries(formData.entries());

        try {
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(body)
          });

          const data = await res.json();

          if (res.ok && data.success) {
            feedback.className = 'p-4 rounded-xl text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30';
            feedback.textContent = data.message || 'Thank you! Message sent successfully.';
            contactForm.reset();
            if (contactRendered) contactRendered.value = Date.now();
          } else {
            feedback.className = 'p-4 rounded-xl text-xs font-semibold bg-red-950/80 text-red-400 border border-red-500/30';
            feedback.textContent = data.error || (data.details && data.details[0]?.message) || 'Failed to send message. Please try again.';
          }
        } catch (err) {
          feedback.className = 'p-4 rounded-xl text-xs font-semibold bg-red-950/80 text-red-400 border border-red-500/30';
          feedback.textContent = 'Network error while sending message.';
        } finally {
          submitBtn.disabled = false;
          if (btnText) btnText.textContent = 'Submit Message';
          if (btnSpinner) btnSpinner.classList.add('hidden');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', initForms);
  document.addEventListener('kwizz:navigated', initForms);
})();


/* =========================================================
   NOERZ ACTIVATOR — activate.js
   Logic: send + verify activation + cek kuota
   ========================================================= */

(function () {
  'use strict';

  let userProfile = null;
  let userId = null;

  document.addEventListener('DOMContentLoaded', async function () {
    const page = document.body.dataset.page;
    if (page !== 'activate') return;

    await new Promise(function (r) { setTimeout(r, 400); });

    const user = await window.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    userId = user.id;

    userProfile = await window.checkAndDowngrade(userId);
    if (!userProfile) {
      window.showToast('Gagal load profil.', 'error');
      return;
    }

    /* Render tier info di atas */
    renderTierInfo(userProfile);

    /* Cek kuota */
    if (!hasQuota(userProfile)) {
      window.showToast('Kuota habis. Upgrade tier dulu.', 'error');
      setTimeout(function () {
        window.location.href = 'upgrade.html';
      }, 1500);
      return;
    }

    initTabs();
    initSendForm();
    initVerifyForm();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        window.logoutUser();
      });
    }
  });

  /* ============ TIER INFO ============ */
  function renderTierInfo(profile) {
    const tier = window.getTierById(profile.tier || 'free');

    const nameEl = document.getElementById('tierInfoName');
    const statusEl = document.getElementById('tierInfoStatus');
    const badgeEl = document.getElementById('tierInfoBadge');
    const iconEl = document.querySelector('.tier-info-icon .bx');

    if (nameEl) nameEl.textContent = tier.name;
    if (badgeEl) {
      badgeEl.textContent = tier.name;
      badgeEl.className = 'tier-info-badge' + (tier.id === 'free' ? ' free' : '');
    }
    if (iconEl) iconEl.className = 'bx ' + tier.icon;

    if (statusEl) {
      if (tier.unlimited) {
        statusEl.textContent = 'Unlimited aktivasi';
      } else {
        const used = profile.activation_count || 0;
        const total = tier.quota || 3;
        const remaining = Math.max(0, total - used);
        statusEl.textContent = remaining + 'x aktivasi tersisa';
      }
    }
  }

  /* ============ CEK KUOTA ============ */
  function hasQuota(profile) {
    if (profile.tier && profile.tier !== 'free') return true;
    const used = profile.activation_count || 0;
    return used < 3;
  }

  /* ============ TABS ============ */
  function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.panel');
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        const target = tab.dataset.tab;
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        panels.forEach(function (p) {
          p.classList.remove('active');
          if (p.id === 'panel-' + target) p.classList.add('active');
        });
      });
    });

    window.__goVerifyTab = function () {
      const t = document.querySelector('.tab-btn[data-tab="verify"]');
      if (t) t.click();
    };
    window.__goSendTab = function () {
      const t = document.querySelector('.tab-btn[data-tab="send"]');
      if (t) t.click();
    };
  }

  /* ============ SEND FORM ============ */
  function initSendForm() {
    const form = document.getElementById('sendForm');
    const emailInput = document.getElementById('email');
    const emailError = document.getElementById('emailError');
    const sendBtn = document.getElementById('sendBtn');
    const card = document.getElementById('sendCard');
    const statusCard = document.getElementById('sendStatus');
    const statusIcon = document.getElementById('sendStatusIcon');
    const statusTtl = document.getElementById('sendStatusTitle');
    const statusMsg = document.getElementById('sendStatusMsg');
    const confirmBtn = document.getElementById('confirmReceivedBtn');
    const retryBtn = document.getElementById('retrySendBtn');

    if (!form) return;

    function hideActions() {
      if (confirmBtn) confirmBtn.style.display = 'none';
      if (retryBtn) retryBtn.style.display = 'none';
    }
    hideActions();

    emailInput.addEventListener('input', function () {
      if (window.isValidEmail(emailInput.value.trim())) {
        window.setFieldError(emailInput, emailError, false);
      }
    });

    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        if (typeof window.__goVerifyTab === 'function') window.__goVerifyTab();
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        statusCard.classList.remove('show', 'success', 'error');
        if (card) card.style.display = '';
        form.reset();
        hideActions();
        emailInput.focus();
      });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = emailInput.value.trim();

      if (!email || !window.isValidEmail(email)) {
        window.setFieldError(emailInput, emailError, true);
        window.showToast('Masukkan email yang valid.', 'error');
        emailInput.focus();
        return;
      }

      window.setFieldError(emailInput, emailError, false);
      window.setLoading(sendBtn, true, '<span class="spinner"></span> Sending...');
      hideActions();

      try {
        const res = await fetch(API_SEND, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        });

        const data = await res.json();
        const ok = res.ok && (!data || data.status !== false);

        if (ok) {
          try { sessionStorage.setItem('activationEmail', email); } catch (e) {}
          window.showToast('Berhasil! Cek folder spam di Gmail.', 'success');

          showStatus('success', 'Berhasil',
            'Silahkan cek folder spam di Gmail, salin link lalu tempel di opsi Verify.');

          if (confirmBtn) confirmBtn.style.display = 'inline-flex';
        } else {
          const msg = (data && (data.error || data.message)) || 'Email tidak tersedia, pastikan email anda benar.';
          window.showToast(msg, 'error');
          showStatus('error', 'Gagal', msg);
          if (retryBtn) retryBtn.style.display = 'inline-flex';
        }
      } catch (err) {
        const msg = 'Unable to connect to activation server. Please try again.';
        window.showToast(msg, 'error');
        showStatus('error', 'Gagal', msg);
        if (retryBtn) retryBtn.style.display = 'inline-flex';
      } finally {
        window.setLoading(sendBtn, false, "<i class='bx bx-paper-plane'></i> Send Activation");
      }
    });

    function showStatus(type, title, message) {
      if (card) card.style.display = 'none';
      statusCard.classList.add('show', type);
      statusIcon.className = 'status-icon ' + type;
      statusIcon.innerHTML = type === 'success'
        ? "<i class='bx bx-check-circle'></i>"
        : "<i class='bx bx-error-circle'></i>";
      statusTtl.textContent = title;
      statusMsg.textContent = message;
      hideActions();
    }
  }

  /* ============ VERIFY FORM ============ */
  function initVerifyForm() {
    const form = document.getElementById('verifyForm');
    const emailInput = document.getElementById('verifyEmail');
    const linkInput = document.getElementById('activationLink');
    const emailError = document.getElementById('verifyEmailError');
    const linkError = document.getElementById('linkError');
    const verifyBtn = document.getElementById('verifyBtn');
    const card = document.getElementById('verifyCard');
    const statusCard = document.getElementById('verifyStatus');
    const statusIcon = document.getElementById('verifyStatusIcon');
    const statusTtl = document.getElementById('verifyStatusTitle');
    const statusMsg = document.getElementById('verifyStatusMsg');
    const sendAgainBtn = document.getElementById('sendAgainBtn');

    if (!form) return;

    try {
      const saved = sessionStorage.getItem('activationEmail');
      if (saved) emailInput.value = saved;
    } catch (e) {}

    emailInput.addEventListener('input', function () {
      if (window.isValidEmail(emailInput.value.trim())) {
        window.setFieldError(emailInput, emailError, false);
      }
    });

    linkInput.addEventListener('input', function () {
      const v = linkInput.value.trim();
      if (v && (v.startsWith('http://') || v.startsWith('https://'))) {
        window.setFieldError(linkInput, linkError, false);
      }
    });

    if (sendAgainBtn) {
      sendAgainBtn.addEventListener('click', function () {
        statusCard.classList.remove('show', 'success', 'error');
        if (card) card.style.display = '';
        form.reset();
        if (typeof window.__goSendTab === 'function') window.__goSendTab();
      });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = emailInput.value.trim();
      const link = linkInput.value.trim();
      let hasErr = false;

      if (!email || !window.isValidEmail(email)) {
        window.setFieldError(emailInput, emailError, true);
        hasErr = true;
      } else {
        window.setFieldError(emailInput, emailError, false);
      }

      if (!link || (!link.startsWith('http://') && !link.startsWith('https://'))) {
        window.setFieldError(linkInput, linkError, true);
        hasErr = true;
      } else {
        window.setFieldError(linkInput, linkError, false);
      }

      if (hasErr) {
        window.showToast('Perbaiki input yang salah.', 'error');
        return;
      }

      window.setLoading(verifyBtn, true, '<span class="spinner"></span> Verifying...');

      try {
        const res = await fetch(API_VERIFY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, link: link })
        });

        const data = await res.json();
        const ok = res.ok && (!data || data.status !== false);

        if (ok) {
          await incrementActivationCount();
          await logActivation(email, link, 'success');

          window.showToast('Aktivasi berhasil!', 'success');
          showStatus('success', 'Activation Successful',
            (data && (data.message || data.msg)) || 'Aktivasi Anda berhasil.');

          userProfile = await window.getProfile(userId);
          renderTierInfo(userProfile);
        } else {
          const msg = (data && (data.error || data.message)) || 'Verifikasi gagal. Coba lagi.';
          window.showToast(msg, 'error');
          showStatus('error', 'Verification Failed', msg);
          await logActivation(email, link, 'failed');
        }
      } catch (err) {
        const msg = 'Unable to connect to activation server. Please try again.';
        window.showToast(msg, 'error');
        showStatus('error', 'Verification Failed', msg);
      } finally {
        window.setLoading(verifyBtn, false, "<i class='bx bx-shield-quarter'></i> Verify Activation");
      }
    });

    function showStatus(type, title, message) {
      if (card) card.style.display = 'none';
      statusCard.classList.add('show', type);
      statusIcon.className = 'status-icon ' + type;
      statusIcon.innerHTML = type === 'success'
        ? "<i class='bx bx-check-circle'></i>"
        : "<i class='bx bx-error-circle'></i>";
      statusTtl.textContent = title;
      statusMsg.textContent = message;
    }
  }

  /* ============ INCREMENT ============ */
  async function incrementActivationCount() {
    if (!window.supabase) return;
    if (SUPABASE_URL.indexOf('YOUR-PROJECT') !== -1) return;

    try {
      const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const current = (userProfile && userProfile.activation_count) || 0;

      await sb.from('profiles')
        .update({ activation_count: current + 1 })
        .eq('id', userId);

      userProfile.activation_count = current + 1;
    } catch (err) {}
  }

  /* ============ LOG ACTIVATION ============ */
  async function logActivation(email, link, status) {
    if (!window.supabase) return;
    if (SUPABASE_URL.indexOf('YOUR-PROJECT') !== -1) return;

    try {
      const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await sb.from('activations').insert({
        user_id: userId,
        email_target: email,
        status: status,
        created_at: new Date().toISOString()
      });
    } catch (err) {}
  }
})();
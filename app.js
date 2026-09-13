/* =========================================================
   Noerz Activator — app.js
   Handle:
   - Menu panel (hamburger)
   - FAQ accordion
   - Activate page (tab Send / Verify + API + konfirmasi)
   - Donation page (copy to clipboard + download QRIS)
   - Feedback page (kirim ke WhatsApp)
   ========================================================= */

(function () {
  'use strict';

  /* ============ CONFIG ============ */
  const API_SEND   = 'https://api.alwayscodex.eu.cc/api/am/sendv2';
  const API_VERIFY = 'https://api.alwayscodex.eu.cc/api/am/verifv2';
  const WA_NUMBER  = '6289654291565';
  const TIMEOUT    = 30000;
  const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* ============ INIT ============ */
  document.addEventListener('DOMContentLoaded', function () {
    initMenu();
    initFAQ();
    initPage();
  });

  /* ============ MENU PANEL ============ */
  function initMenu() {
    const openBtn  = document.getElementById('menuOpenBtn');
    const closeBtn = document.getElementById('menuCloseBtn');
    const overlay  = document.getElementById('menuOverlay');
    const panel    = document.getElementById('menuPanel');
    if (!openBtn || !panel) return;

    function open() {
      if (overlay) overlay.classList.add('open');
      panel.classList.add('open');
      panel.setAttribute('aria-hidden', 'false');
      openBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      if (overlay) overlay.classList.remove('open');
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (overlay) overlay.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  /* ============ FAQ ============ */
  function initFAQ() {
    const items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    items.forEach(function (item) {
      const btn    = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!btn || !answer) return;

      btn.addEventListener('click', function () {
        const isOpen = item.classList.contains('open');

        items.forEach(function (other) {
          if (other !== item && other.classList.contains('open')) {
            other.classList.remove('open');
            other.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            other.querySelector('.faq-answer').style.maxHeight = null;
          }
        });

        if (isOpen) {
          item.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
          answer.style.maxHeight = null;
        } else {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    });
  }

  /* ============ PAGE ROUTER ============ */
  function initPage() {
    const page = document.body.dataset.page;
    if (page === 'activate') initActivatePage();
    if (page === 'donation') initDonationPage();
    if (page === 'feedback') initFeedbackPage();
  }

  /* ============ HELPERS ============ */
  function showToast(message, type) {
    type = type || 'info';
    let wrap = document.getElementById('toastWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      wrap.id = 'toastWrap';
      document.body.appendChild(wrap);
    }

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const icon = type === 'success' ? 'bx-check-circle'
               : type === 'error'   ? 'bx-error-circle'
               : 'bx-info-circle';
    toast.innerHTML = "<i class='bx " + icon + "'></i><span></span>";
    toast.querySelector('span').textContent = message;
    wrap.appendChild(toast);

    setTimeout(function () {
      toast.style.transition = 'opacity .3s, transform .3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      setTimeout(function () {
        if (toast.parentNode) toast.remove();
      }, 300);
    }, 4500);
  }

  function setLoading(btn, loading, label) {
    if (!btn) return;
    const labelEl = btn.querySelector('.btn-label');
    if (loading) {
      btn.disabled = true;
      btn.classList.add('loading');
      if (labelEl && label) labelEl.textContent = label;
    } else {
      btn.disabled = false;
      btn.classList.remove('loading');
      if (labelEl && label) labelEl.textContent = label;
    }
  }

  function setFieldError(input, errorEl, show) {
    if (!input || !errorEl) return;
    if (show) {
      input.classList.add('error');
      errorEl.classList.add('show');
    } else {
      input.classList.remove('error');
      errorEl.classList.remove('show');
    }
  }

  function safeMessage(status, apiMessage) {
    if (apiMessage && typeof apiMessage === 'string') return apiMessage;
    const map = {
      400: 'Permintaan tidak valid. Periksa kembali input Anda.',
      401: 'Autentikasi diperlukan.',
      403: 'Akses ditolak.',
      404: 'Endpoint tidak ditemukan.',
      429: 'Terlalu banyak permintaan. Tunggu sebentar.',
      500: 'Kesalahan server. Coba lagi nanti.',
      502: 'Layanan sementara tidak tersedia.',
      503: 'Layanan sementara tidak tersedia.'
    };
    return map[status] || 'Terjadi kesalahan. Silakan coba lagi.';
  }

  function pickApiMessage(data) {
    if (!data || typeof data !== 'object') return null;
    return data.message || data.msg || data.error || data.detail || null;
  }

  function isApiSuccess(result) {
    if (!result.ok) return false;
    if (result.data && result.data.status === false) return false;
    if (result.data && result.data.success === false) return false;
    return true;
  }

  async function apiRequest(url, body) {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, TIMEOUT);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);

      let data = null;
      try {
        const text = await res.text();
        if (text && text.trim()) data = JSON.parse(text);
      } catch (e) {
        data = null;
      }

      return { ok: res.ok, status: res.status, data: data };
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('TIMEOUT');
      throw new Error('NETWORK');
    }
  }

  /* ============ ACTIVATE PAGE ============ */
  function initActivatePage() {
    initTabs();
    initSendForm();
    initVerifyForm();
  }

  function initTabs() {
    const tabs   = document.querySelectorAll('.tab-btn');
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
      const verifyTab = document.querySelector('.tab-btn[data-tab="verify"]');
      if (verifyTab) verifyTab.click();
    };

    window.__goSendTab = function () {
      const sendTab = document.querySelector('.tab-btn[data-tab="send"]');
      if (sendTab) sendTab.click();
    };
  }

  /* ============ SEND FORM ============ */
  function initSendForm() {
    const form        = document.getElementById('sendForm');
    const emailInput  = document.getElementById('email');
    const emailError  = document.getElementById('emailError');
    const sendBtn     = document.getElementById('sendBtn');
    const card        = document.getElementById('sendCard');
    const statusCard  = document.getElementById('sendStatus');
    const statusIcon  = document.getElementById('sendStatusIcon');
    const statusTtl   = document.getElementById('sendStatusTitle');
    const statusMsg   = document.getElementById('sendStatusMsg');
    const confirmBtn  = document.getElementById('confirmReceivedBtn');
    const retryBtn    = document.getElementById('retrySendBtn');

    if (!form) return;

    function hideAllActions() {
      if (confirmBtn) confirmBtn.style.display = 'none';
      if (retryBtn)   retryBtn.style.display = 'none';
    }
    hideAllActions();

    emailInput.addEventListener('input', function () {
      if (EMAIL_RE.test(emailInput.value.trim())) {
        setFieldError(emailInput, emailError, false);
      }
    });

    if (confirmBtn) {
      confirmBtn.addEventListener('click', function () {
        if (typeof window.__goVerifyTab === 'function') {
          window.__goVerifyTab();
        }
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        statusCard.classList.remove('show', 'success', 'error');
        if (card) card.style.display = '';
        form.reset();
        hideAllActions();
        emailInput.focus();
      });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const email = emailInput.value.trim();

      if (!email || !EMAIL_RE.test(email)) {
        setFieldError(emailInput, emailError, true);
        showToast('Masukkan alamat email yang valid.', 'error');
        emailInput.focus();
        return;
      }

      setFieldError(emailInput, emailError, false);
      setLoading(sendBtn, true, 'Sending...');
      hideAllActions();

      try {
        const result = await apiRequest(API_SEND, { email: email });

        if (isApiSuccess(result)) {
          try { sessionStorage.setItem('activationEmail', email); } catch (e) {}
          showToast('Berhasil! Cek folder spam di Gmail Anda.', 'success');

          showStatus(
            'success',
            'Berhasil',
            'Silahkan cek folder spam di Gmail, salin link lalu tempel di opsi Verify.'
          );

          if (confirmBtn) confirmBtn.style.display = 'inline-flex';

        } else {
          showToast('Email tidak tersedia.', 'error');
          showStatus(
            'error',
            'Gagal',
            'Email tidak tersedia, pastikan email anda benar.'
          );

          if (retryBtn) retryBtn.style.display = 'inline-flex';
        }

      } catch (err) {
        const msg = err.message === 'TIMEOUT'
          ? 'Request timed out. Please try again.'
          : 'Unable to connect to activation server. Please try again.';
        showToast(msg, 'error');
        showStatus('error', 'Gagal', msg);

        if (retryBtn) retryBtn.style.display = 'inline-flex';
      } finally {
        setLoading(sendBtn, false, 'Send Activation');
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
      hideAllActions();
    }
  }

  /* ============ VERIFY FORM ============ */
  function initVerifyForm() {
    const form         = document.getElementById('verifyForm');
    const emailInput   = document.getElementById('verifyEmail');
    const linkInput    = document.getElementById('activationLink');
    const emailError   = document.getElementById('verifyEmailError');
    const linkError    = document.getElementById('linkError');
    const verifyBtn    = document.getElementById('verifyBtn');
    const card         = document.getElementById('verifyCard');
    const statusCard   = document.getElementById('verifyStatus');
    const statusIcon   = document.getElementById('verifyStatusIcon');
    const statusTtl    = document.getElementById('verifyStatusTitle');
    const statusMsg    = document.getElementById('verifyStatusMsg');
    const sessionBadge = document.getElementById('sessionBadge');
    const sendAgainBtn = document.getElementById('sendAgainBtn');

    if (!form) return;

    try {
      const saved = sessionStorage.getItem('activationEmail');
      if (saved) {
        emailInput.value = saved;
        if (sessionBadge) sessionBadge.classList.add('show');
      }
    } catch (e) {}

    emailInput.addEventListener('input', function () {
      if (EMAIL_RE.test(emailInput.value.trim())) {
        setFieldError(emailInput, emailError, false);
      }
      if (sessionBadge) sessionBadge.classList.remove('show');
    });

    linkInput.addEventListener('input', function () {
      const v = linkInput.value.trim();
      if (v && (v.startsWith('http://') || v.startsWith('https://'))) {
        setFieldError(linkInput, linkError, false);
      }
    });

    if (sendAgainBtn) {
      sendAgainBtn.addEventListener('click', function () {
        statusCard.classList.remove('show', 'success', 'error');
        if (card) card.style.display = '';
        form.reset();
        if (sessionBadge) sessionBadge.classList.remove('show');
        if (typeof window.__goSendTab === 'function') window.__goSendTab();
      });
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const email = emailInput.value.trim();
      const link  = linkInput.value.trim();
      let hasErr  = false;

      if (!email || !EMAIL_RE.test(email)) {
        setFieldError(emailInput, emailError, true);
        hasErr = true;
      } else {
        setFieldError(emailInput, emailError, false);
      }

      if (!link || (!link.startsWith('http://') && !link.startsWith('https://'))) {
        setFieldError(linkInput, linkError, true);
        hasErr = true;
      } else {
        setFieldError(linkInput, linkError, false);
      }

      if (hasErr) {
        showToast('Perbaiki input yang salah terlebih dahulu.', 'error');
        return;
      }

      setLoading(verifyBtn, true, 'Verifying...');

      try {
        const result = await apiRequest(API_VERIFY, { email: email, link: link });

        if (isApiSuccess(result)) {
          try { sessionStorage.removeItem('activationEmail'); } catch (e) {}
          showToast('Aktivasi berhasil diverifikasi.', 'success');
          const apiMsg = pickApiMessage(result.data);
          showStatus('success', 'Activation Successful',
            apiMsg || 'Aktivasi Anda berhasil diverifikasi.');
        } else {
          const apiMsg = pickApiMessage(result.data);
          const msg = safeMessage(result.status, apiMsg);
          showToast(msg, 'error');
          showStatus('error', 'Verification Failed', msg);
        }
      } catch (err) {
        const msg = err.message === 'TIMEOUT'
          ? 'Request timed out. Please try again.'
          : 'Unable to connect to activation server. Please try again.';
        showToast(msg, 'error');
        showStatus('error', 'Verification Failed', msg);
      } finally {
        setLoading(verifyBtn, false, 'Verify Activation');
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

  /* ============ DONATION PAGE ============ */
  function initDonationPage() {
    // Copy-to-clipboard (untuk item dengan data-copy, kalau ada)
    const items = document.querySelectorAll('.donate-item[data-copy]');
    items.forEach(function (item) {
      item.addEventListener('click', async function () {
        const text = item.dataset.copy;
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
          } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
          item.classList.add('copied');
          showToast('Berhasil disalin: ' + text, 'success');
          setTimeout(function () { item.classList.remove('copied'); }, 2000);
        } catch (err) {
          showToast('Gagal menyalin. Salin manual ya.', 'error');
        }
      });
    });

    // Tombol unduh QRIS
    const downloadTopBtn = document.getElementById('qrisDownloadTop');
    const downloadBtn    = document.getElementById('qrisDownloadBtn');
    const qrisImage      = document.getElementById('qrisImage');

    function downloadQRIS() {
      if (!qrisImage) return;
      try {
        const link = document.createElement('a');
        link.href = qrisImage.src;
        link.download = 'qris-noerz-activator.png';
        link.target = '_blank';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('QRIS berhasil diunduh.', 'success');
      } catch (err) {
        window.open(qrisImage.src, '_blank');
        showToast('Gambar dibuka di tab baru. Tekan lama untuk menyimpan.', 'info');
      }
    }

    if (downloadTopBtn) downloadTopBtn.addEventListener('click', downloadQRIS);
    if (downloadBtn)    downloadBtn.addEventListener('click', downloadQRIS);
  }

  /* ============ FEEDBACK PAGE ============ */
  function initFeedbackPage() {
    const form = document.getElementById('feedbackForm');
    const btn  = document.getElementById('fbSubmitBtn');
    if (!form) return;

    const nameInput  = document.getElementById('fbName');
    const emailInput = document.getElementById('fbEmail');
    const typeInput  = document.getElementById('fbType');
    const msgInput   = document.getElementById('fbMessage');

    const nameErr  = document.getElementById('fbNameError');
    const emailErr = document.getElementById('fbEmailError');
    const typeErr  = document.getElementById('fbTypeError');
    const msgErr   = document.getElementById('fbMessageError');

    [nameInput, emailInput, typeInput, msgInput].forEach(function (input) {
      if (!input) return;
      input.addEventListener('input', function () {
        if (input.value.trim()) {
          input.classList.remove('error');
          const errEl = document.getElementById(input.id + 'Error');
          if (errEl) errEl.classList.remove('show');
        }
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name  = nameInput.value.trim();
      const email = emailInput.value.trim();
      const type  = typeInput.value;
      const msg   = msgInput.value.trim();

      let hasErr = false;

      if (!name) {
        setFieldError(nameInput, nameErr, true);
        hasErr = true;
      } else setFieldError(nameInput, nameErr, false);

      if (!email || !EMAIL_RE.test(email)) {
        setFieldError(emailInput, emailErr, true);
        hasErr = true;
      } else setFieldError(emailInput, emailErr, false);

      if (!type) {
        setFieldError(typeInput, typeErr, true);
        hasErr = true;
      } else setFieldError(typeInput, typeErr, false);

      if (!msg || msg.length < 10) {
        setFieldError(msgInput, msgErr, true);
        hasErr = true;
      } else setFieldError(msgInput, msgErr, false);

      if (hasErr) {
        showToast('Perbaiki input yang salah terlebih dahulu.', 'error');
        return;
      }

      const now = new Date();
      const tanggal = now.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const pesan =
        '*📋 LAPORAN FEEDBACK — Noerz Activator*\n' +
        '━━━━━━━━━━━━━━━━━━━━\n\n' +
        '*👤 Nama:*\n' + name + '\n\n' +
        '*📧 Email:*\n' + email + '\n\n' +
        '*📌 Jenis Laporan:*\n' + type + '\n\n' +
        '*💬 Pesan:*\n' + msg + '\n\n' +
        '━━━━━━━━━━━━━━━━━━━━\n' +
        '_Dikirim pada: ' + tanggal + '_\n' +
        '_via Noerz Activator — AM Activators Engine_';

      const waUrl = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(pesan);

      if (btn) {
        btn.disabled = true;
        const label = btn.querySelector('.btn-label');
        if (label) label.textContent = 'Membuka WhatsApp...';
      }

      showToast('Membuka WhatsApp...', 'info');

      setTimeout(function () {
        window.open(waUrl, '_blank');
        if (btn) {
          btn.disabled = false;
          const label = btn.querySelector('.btn-label');
          if (label) label.textContent = 'Kirim via WhatsApp';
        }
      }, 400);
    });
  }

})();
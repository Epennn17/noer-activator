/* =========================================================
   NOERZ ACTIVATOR — upgrade.js
   Logic: pilih tier, create payment, cek status
   ========================================================= */

(function() {
  'use strict';
  
  let currentPayment = null;
  let countdownTimer = null;
  
  document.addEventListener('DOMContentLoaded', async function() {
    const page = document.body.dataset.page;
    if (page !== 'upgrade') return;
    
    await new Promise(function(r) { setTimeout(r, 400); });
    
    const userId = document.body.dataset.userId;
    if (!userId) return;
    
    renderTierList();
    
    const modal = document.getElementById('paymentModal');
    const modalClose = document.getElementById('modalClose');
    
    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
      });
    }
    
    /* Logout button */
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        window.logoutUser();
      });
    }
  });
  
  /* ============ RENDER TIER LIST ============ */
  function renderTierList() {
    const container = document.getElementById('pricingFull');
    if (!container) return;
    
    container.innerHTML = '';
    
    /* Skip Free */
    const paidTiers = TIERS.filter(function(t) { return t.id !== 'free'; });
    
    paidTiers.forEach(function(tier) {
      const card = document.createElement('div');
      card.className = 'tier-select-card' + (tier.popular ? ' popular' : '');
      
      card.innerHTML =
        '<div class="tier-select-icon"><i class="bx ' + tier.icon + '"></i></div>' +
        '<div class="tier-select-name">' + window.escapeHtml(tier.name) + '</div>' +
        '<div class="tier-select-price">' + formatRupiah(tier.price) + '</div>' +
        '<div class="tier-select-duration">' + window.escapeHtml(tier.duration) + '</div>' +
        '<ul class="tier-select-features">' +
        tier.features.map(function(f) {
          return '<li><i class="bx bx-check"></i> ' + window.escapeHtml(f) + '</li>';
        }).join('') +
        '</ul>' +
        '<button type="button" class="btn btn-primary" data-tier="' + tier.id + '">' +
        "<i class='bx bx-cart'></i> Pilih" +
        '</button>';
      
      card.querySelector('button').addEventListener('click', function() {
        startPayment(tier);
      });
      
      container.appendChild(card);
    });
  }
  
  /* ============ START PAYMENT ============ */
  async function startPayment(tier) {
    const modal = document.getElementById('paymentModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalBody) return;
    
    modalTitle.textContent = 'Pembayaran · ' + tier.name;
    modalBody.innerHTML =
      '<div class="modal-loading">' +
      '<div class="spinner-lg"></div>' +
      '<p>Membuat pembayaran...</p>' +
      '</div>';
    
    modal.classList.add('show');
    
    try {
      const result = await createPayment(tier);
      
      if (!result || !result.success) {
        throw new Error('Gagal membuat pembayaran');
      }
      
      currentPayment = {
        transactionId: result.result.payment_info.transaction_id,
        orderId: result.result.order_id,
        tier: tier,
        amount: result.result.total_amount,
        expiresAt: result.result.expired_at,
        qrString: result.result.payment_info.qr_string,
        paymentUrl: result.result.payment_url
      };
      
      renderPaymentModal(currentPayment);
      
    } catch (err) {
      modalBody.innerHTML =
        '<div class="modal-error">' +
        "<i class='bx bx-error-circle'></i>" +
        '<p>' + window.escapeHtml(err.message || 'Gagal membuat pembayaran') + '</p>' +
        '<button type="button" class="btn btn-secondary" onclick="document.getElementById(\'paymentModal\').classList.remove(\'show\')">Tutup</button>' +
        '</div>';
    }
  }
  
  /* ============ CREATE PAYMENT ============ */
  async function createPayment(tier) {
    const userId = document.body.dataset.userId;
    const profile = await window.getProfile(userId);
    
    const username = (profile && profile.username) || 'user';
    const email = (profile && profile.email) || '';
    const name = (profile && profile.username) || 'User';
    
    const url = API_SOCIABUZZ_CREATE +
      '?username=' + encodeURIComponent('noerdevz') +
      '&amount=' + encodeURIComponent(tier.price) +
      '&method=qris' +
      '&name=' + encodeURIComponent(name) +
      '&message=' + encodeURIComponent('Noerz ' + tier.name + ' - ' + username) +
      '&phone=' +
      '&email=' + encodeURIComponent(email);
    
    const res = await fetch(url, { method: 'GET' });
    const data = await res.json();
    return data;
  }
  
  /* ============ RENDER MODAL ============ */
  function renderPaymentModal(payment) {
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    
    modalBody.innerHTML =
      '<div class="payment-info">' +
      '<div class="payment-row">' +
      '<span>Tier</span>' +
      '<strong>' + window.escapeHtml(payment.tier.name) + '</strong>' +
      '</div>' +
      '<div class="payment-row">' +
      '<span>Total Bayar</span>' +
      '<strong>' + formatRupiah(payment.amount) + '</strong>' +
      '</div>' +
      '<div class="payment-row">' +
      '<span>Metode</span>' +
      '<strong>QRIS</strong>' +
      '</div>' +
      '</div>' +
      
      '<div class="payment-countdown">' +
      'Bayar dalam:' +
      '<strong id="paymentCountdown">--:--</strong>' +
      '</div>' +
      
      '<div class="payment-qris">' +
      '<div id="qrcode"></div>' +
      '</div>' +
      
      '<p class="payment-hint">' +
      'Scan QRIS pakai aplikasi apapun yang mendukung' +
      '</p>' +
      
      '<div class="payment-actions">' +
      '<a href="' + window.escapeHtml(payment.paymentUrl) + '" target="_blank" rel="noopener" class="btn btn-secondary">' +
      "<i class='bx bx-link-external'></i> Buka di Socialbuzz" +
      '</a>' +
      '<button type="button" class="btn btn-primary" id="checkPaymentBtn">' +
      "<i class='bx bx-refresh'></i> Saya Sudah Bayar" +
      '</button>' +
      '</div>';
    
    generateQR(payment.qrString);
    startCountdown(payment.expiresAt);
    
    const checkBtn = document.getElementById('checkPaymentBtn');
    if (checkBtn) {
      checkBtn.addEventListener('click', checkPaymentStatus);
    }
  }
  
  /* ============ QR CODE ============ */
  function generateQR(qrString) {
    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer) return;
    
    if (window.QRCode) {
      new window.QRCode(qrContainer, {
        text: qrString,
        width: 220,
        height: 220,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      });
    } else {
      qrContainer.innerHTML = '<p style="color:#000;font-size:12px;">QR tidak tersedia</p>';
    }
  }
  
  /* ============ COUNTDOWN ============ */
  function startCountdown(expiresAt) {
    if (countdownTimer) clearInterval(countdownTimer);
    
    const el = document.getElementById('paymentCountdown');
    if (!el) return;
    
    const expires = new Date(expiresAt).getTime();
    
    function tick() {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      
      if (diff <= 0) {
        el.textContent = 'Expired';
        clearInterval(countdownTimer);
        return;
      }
      
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      el.textContent =
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
    }
    
    tick();
    countdownTimer = setInterval(tick, 1000);
  }
  
  /* ============ CHECK PAYMENT ============ */
  async function checkPaymentStatus() {
    if (!currentPayment) return;
    
    const btn = document.getElementById('checkPaymentBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Cek status...";
    }
    
    try {
      const url = API_SOCIABUZZ_CHECK +
        '?transaction_id=' + encodeURIComponent(currentPayment.transactionId);
      
      const res = await fetch(url, { method: 'GET' });
      const data = await res.json();
      
      if (data && data.status === true && data.result && data.result.status === 'paid') {
        window.showToast('Pembayaran berhasil! Tier diaktifkan.', 'success');
        closeModal();
        setTimeout(function() {
          window.location.href = 'dashboard.html';
        }, 1500);
      } else {
        window.showToast('Belum terdeteksi. Coba lagi sebentar.', 'info');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = "<i class='bx bx-refresh'></i> Saya Sudah Bayar";
        }
      }
    } catch (err) {
      window.showToast('Gagal cek status.', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = "<i class='bx bx-refresh'></i> Saya Sudah Bayar";
      }
    }
  }
  
  /* ============ CLOSE ============ */
  function closeModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.classList.remove('show');
    if (countdownTimer) clearInterval(countdownTimer);
    currentPayment = null;
  }
})();
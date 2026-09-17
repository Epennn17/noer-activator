/* =========================================================
   NOERZ ACTIVATOR — app.js
   Helper umum: toast, validasi, DOM ready
   ========================================================= */

(function() {
  'use strict';
  
  /* ============ TOAST ============ */
  window.showToast = function(message, type) {
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
    
    const icon = type === 'success' ? 'bx-check-circle' :
      type === 'error' ? 'bx-error-circle' :
      'bx-info-circle';
    
    toast.innerHTML = "<i class='bx " + icon + "'></i><span></span>";
    toast.querySelector('span').textContent = message;
    wrap.appendChild(toast);
    
    setTimeout(function() {
      toast.style.transition = 'opacity .3s, transform .3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-8px)';
      setTimeout(function() {
        if (toast.parentNode) toast.remove();
      }, 300);
    }, 4000);
  };
  
  /* ============ FIELD HELPERS ============ */
  window.setFieldError = function(input, errorEl, show) {
    if (!input || !errorEl) return;
    if (show) {
      input.classList.add('error');
      errorEl.classList.add('show');
    } else {
      input.classList.remove('error');
      errorEl.classList.remove('show');
    }
  };
  
  window.setLoading = function(btn, loading, label) {
    if (!btn) return;
    const labelEl = btn.querySelector('.btn-label');
    if (loading) {
      btn.disabled = true;
      btn.classList.add('loading');
      if (labelEl && label) labelEl.innerHTML = label;
    } else {
      btn.disabled = false;
      btn.classList.remove('loading');
      if (labelEl && label) labelEl.innerHTML = label;
    }
  };
  
  /* ============ VALIDATION ============ */
  window.EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  window.isValidEmail = function(email) {
    return window.EMAIL_REGEX.test(String(email).trim());
  };
  
  window.isValidUsername = function(username) {
    if (!username) return false;
    const u = String(username).trim();
    return u.length >= 3 && /^[a-zA-Z0-9_]+$/.test(u);
  };
  
  window.isStrongPassword = function(password) {
    return password && password.length >= 6;
  };
  
  /* ============ ESCAPE HTML ============ */
  window.escapeHtml = function(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  
  /* ============ COPY TO CLIPBOARD ============ */
  window.copyToClipboard = async function(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  };
  
  /* ============ PASSWORD STRENGTH ============ */
  window.checkPasswordStrength = function(password) {
    if (!password) return { level: 0, text: 'Masukkan password', class: '' };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    score = Math.min(score, 4);
    
    const levels = [
      { level: 0, text: 'Terlalu pendek', class: 'weak' },
      { level: 1, text: 'Lemah', class: 'weak' },
      { level: 2, text: 'Sedang', class: 'weak' },
      { level: 3, text: 'Kuat', class: 'good' },
      { level: 4, text: 'Sangat kuat', class: 'good' }
    ];
    
    return levels[score];
  };
  
  window.updatePasswordStrength = function(password, bars, textEl) {
    const result = window.checkPasswordStrength(password);
    
    if (bars && bars.length) {
      bars.forEach(function(bar, i) {
        bar.classList.remove('active', 'strong');
        if (i < result.level) {
          if (result.level >= 3) {
            bar.classList.add('strong');
          } else {
            bar.classList.add('active');
          }
        }
      });
    }
    
    if (textEl) {
      textEl.textContent = result.text;
      textEl.className = 'strength-text ' + (result.class || '');
    }
    
    return result;
  };
  
  /* ============ FORMAT DATE ============ */
  window.formatDate = function(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  
  window.formatDateTime = function(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  window.timeAgo = function(dateStr) {
    if (!dateStr) return '-';
    const now = new Date();
    const past = new Date(dateStr);
    const diff = Math.floor((now - past) / 1000);
    
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return Math.floor(diff / 60) + ' menit lalu';
    if (diff < 86400) return Math.floor(diff / 3600) + ' jam lalu';
    if (diff < 604800) return Math.floor(diff / 86400) + ' hari lalu';
    return window.formatDate(dateStr);
  };
  
  /* ============ DOM READY ============ */
  document.addEventListener('DOMContentLoaded', function() {
    /* Auto-bind toggle password */
    document.querySelectorAll('[data-toggle-password]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const targetId = btn.getAttribute('data-toggle-password');
        const input = document.getElementById(targetId);
        if (!input) return;
        
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        
        const icon = btn.querySelector('.bx');
        if (icon) {
          icon.className = isPassword ? 'bx bx-hide' : 'bx bx-show';
        }
      });
    });
    
    /* Auto-bind checkbox terms — clear error kalau dicentang */
    const termsCheckbox = document.getElementById('agreeTerms');
    if (termsCheckbox) {
      termsCheckbox.addEventListener('change', function() {
        const errEl = document.getElementById('termsError');
        if (errEl && termsCheckbox.checked) {
          errEl.classList.remove('show');
        }
      });
    }
    
    /* FAQ mini accordion (untuk activate.html) */
    document.querySelectorAll('.faq-mini-item').forEach(function(item) {
      const btn = item.querySelector('.faq-mini-q');
      const answer = item.querySelector('.faq-mini-a');
      if (!btn || !answer) return;
      
      btn.addEventListener('click', function() {
        const isOpen = item.classList.contains('open');
        
        document.querySelectorAll('.faq-mini-item.open').forEach(function(other) {
          if (other !== item) {
            other.classList.remove('open');
            const otherA = other.querySelector('.faq-mini-a');
            if (otherA) otherA.style.maxHeight = null;
          }
        });
        
        if (isOpen) {
          item.classList.remove('open');
          answer.style.maxHeight = null;
        } else {
          item.classList.add('open');
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });
    });
    
    /* Auto-bind button copy QRIS (donation.html) */
    const qrisImage = document.getElementById('qrisImage');
    const downloadTopBtn = document.getElementById('qrisDownloadTop');
    const downloadBtn = document.getElementById('qrisDownloadBtn');
    
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
        window.showToast('QRIS berhasil diunduh.', 'success');
      } catch (err) {
        window.open(qrisImage.src, '_blank');
        window.showToast('Gambar dibuka di tab baru.', 'info');
      }
    }
    
    if (downloadTopBtn) downloadTopBtn.addEventListener('click', downloadQRIS);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadQRIS);
  });
})();
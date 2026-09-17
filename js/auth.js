/* =========================================================
   NOERZ ACTIVATOR — auth.js
   Logic: login, register, logout, session
   ========================================================= */

(function () {
  'use strict';

  /* ============ SUPABASE CLIENT ============ */
  let _sb = null;

  function getSB() {
    if (_sb) return _sb;
    if (!window.supabase) {
      console.error('[auth] Supabase library belum di-load');
      return null;
    }
    if (SUPABASE_URL.indexOf('YOUR-PROJECT') !== -1) {
      console.error('[auth] Supabase URL belum dikonfigurasi');
      return null;
    }
    if (SUPABASE_ANON_KEY.indexOf('YOUR-ANON') !== -1) {
      console.error('[auth] Supabase anon key belum dikonfigurasi');
      return null;
    }
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _sb;
  }

  /* ============ GET CURRENT USER ============ */
  window.getCurrentUser = async function () {
    const sb = getSB();
    if (!sb) return null;
    try {
      const { data: { user }, error } = await sb.auth.getUser();
      if (error) return null;
      return user;
    } catch (err) {
      return null;
    }
  };

  /* ============ GET PROFILE ============ */
  window.getProfile = async function (userId) {
    const sb = getSB();
    if (!sb) return null;
    try {
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) return null;
      return data;
    } catch (err) {
      return null;
    }
  };

  /* ============ CHECK & DOWNGRADE TIER ============ */
  window.checkAndDowngrade = async function (userId) {
    const profile = await window.getProfile(userId);
    if (!profile) return null;

    if (profile.tier !== 'free' && profile.tier_expires_at) {
      const now = new Date();
      const expiresAt = new Date(profile.tier_expires_at);

      if (expiresAt < now) {
        const sb = getSB();
        if (sb) {
          const { data: updated } = await sb
            .from('profiles')
            .update({
              tier: 'free',
              tier_expires_at: null,
              activation_count: 0
            })
            .eq('id', userId)
            .select()
            .single();

          return Object.assign({}, updated || profile, {
            tier: 'free',
            tier_expires_at: null,
            activation_count: 0,
            downgraded: true
          });
        }
      }
    }

    return Object.assign({}, profile, { downgraded: false });
  };

  /* ============ REGISTER ============ */
  window.registerUser = async function (email, password, username) {
    const sb = getSB();
    if (!sb) throw new Error('Supabase belum dikonfigurasi');

    const { data, error } = await sb.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { username: username },
        emailRedirectTo: window.location.origin + '/login.html'
      }
    });

    if (error) throw error;
    return data;
  };

  /* ============ LOGIN ============ */
  window.loginUser = async function (email, password) {
    const sb = getSB();
    if (!sb) throw new Error('Supabase belum dikonfigurasi');

    const { data, error } = await sb.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;
    return data;
  };

  /* ============ LOGIN GOOGLE ============ */
  window.loginGoogle = async function () {
    const sb = getSB();
    if (!sb) throw new Error('Supabase belum dikonfigurasi');

    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard.html'
      }
    });

    if (error) throw error;
    return data;
  };

  /* ============ LOGOUT ============ */
  window.logoutUser = async function () {
    const sb = getSB();
    if (sb) {
      try { await sb.auth.signOut(); } catch (err) {}
    }
    window.location.href = 'index.html';
  };

  /* ============ FORGOT PASSWORD ============ */
  window.sendResetPassword = async function (email) {
    const sb = getSB();
    if (!sb) throw new Error('Supabase belum dikonfigurasi');

    const { data, error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login.html'
    });

    if (error) throw error;
    return data;
  };

  /* ============ REQUIRE LOGIN ============ */
  window.requireLogin = async function () {
    const user = await window.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    return user;
  };

  /* ============ REQUIRE ADMIN ============ */
  window.requireAdmin = async function () {
    const user = await window.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    if (user.email !== ADMIN_EMAIL) {
      window.location.href = 'dashboard.html';
      return null;
    }
    return user;
  };

  /* ============ PAGE INIT ============ */
  document.addEventListener('DOMContentLoaded', async function () {
    const page = document.body.dataset.page;

    /* Halaman yang butuh login */
    if (page === 'dashboard' || page === 'upgrade' || page === 'activate') {
      const user = await window.getCurrentUser();
      if (!user) {
        window.location.href = 'login.html';
        return;
      }
      document.body.dataset.userId = user.id;
      document.body.dataset.userEmail = user.email;
    }

    /* Halaman admin */
    if (page === 'admin') {
      const user = await window.requireAdmin();
      if (!user) return;
      document.body.dataset.userId = user.id;
    }

    /* Login/register: kalau sudah login, redirect ke dashboard */
    if (page === 'login' || page === 'register' || page === 'forgot-password') {
      const user = await window.getCurrentUser();
      if (user && page !== 'forgot-password') {
        window.location.href = 'dashboard.html';
        return;
      }
    }

    /* Home: update navbar kalau user login */
    if (page === 'home') {
      const user = await window.getCurrentUser();
      const navActions = document.getElementById('navActions');
      if (navActions && user) {
        navActions.innerHTML =
          '<a href="dashboard.html" class="btn-nav primary">' +
            "<i class='bx bx-home'></i> Dashboard" +
          '</a>';
      }
    }
  });

  /* ============ LOGIN PAGE HANDLER ============ */
  document.addEventListener('DOMContentLoaded', function () {
    const page = document.body.dataset.page;

    /* Login form */
    if (page === 'login') {
      const form = document.getElementById('loginForm');
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const emailError = document.getElementById('emailError');
      const passwordError = document.getElementById('passwordError');
      const loginBtn = document.getElementById('loginBtn');
      const googleBtn = document.getElementById('googleLoginBtn');

      if (form) {
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          const email = emailInput.value.trim();
          const password = passwordInput.value;

          let hasErr = false;
          if (!email || !window.isValidEmail(email)) {
            window.setFieldError(emailInput, emailError, true);
            hasErr = true;
          } else {
            window.setFieldError(emailInput, emailError, false);
          }
          if (!password || password.length < 6) {
            window.setFieldError(passwordInput, passwordError, true);
            hasErr = true;
          } else {
            window.setFieldError(passwordInput, passwordError, false);
          }
          if (hasErr) return;

          window.setLoading(loginBtn, true, '<span class="spinner"></span> Login...');

          try {
            await window.loginUser(email, password);
            window.showToast('Login berhasil!', 'success');
            setTimeout(function () {
              window.location.href = 'dashboard.html';
            }, 800);
          } catch (err) {
            const msg = err.message || 'Email atau password salah.';
            window.showToast(msg, 'error');
            window.setLoading(loginBtn, false, "<i class='bx bx-log-in'></i> Login");
          }
        });
      }

      if (googleBtn) {
        googleBtn.addEventListener('click', async function () {
          try {
            await window.loginGoogle();
          } catch (err) {
            window.showToast(err.message || 'Gagal login Google.', 'error');
          }
        });
      }
    }

    /* Register form */
    if (page === 'register') {
      const form = document.getElementById('registerForm');
      const usernameInput = document.getElementById('username');
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const confirmInput = document.getElementById('confirmPassword');
      const agreeInput = document.getElementById('agreeTerms');
      const usernameError = document.getElementById('usernameError');
      const emailError = document.getElementById('emailError');
      const passwordError = document.getElementById('passwordError');
      const confirmError = document.getElementById('confirmError');
      const termsError = document.getElementById('termsError');
      const registerBtn = document.getElementById('registerBtn');
      const googleBtn = document.getElementById('googleRegisterBtn');
      const registerCard = document.getElementById('registerCard');
      const successCard = document.getElementById('successCard');
      const successEmail = document.getElementById('successEmail');
      const authHead = document.getElementById('authHead');
      const authFoot = document.getElementById('authFoot');

      /* Password strength */
      const strengthBars = document.querySelectorAll('#strengthBars .strength-bar');
      const strengthText = document.getElementById('strengthText');
      if (passwordInput) {
        passwordInput.addEventListener('input', function () {
          window.updatePasswordStrength(passwordInput.value, strengthBars, strengthText);
          if (passwordInput.value.length >= 6) {
            window.setFieldError(passwordInput, passwordError, false);
          }
        });
      }

      if (form) {
        form.addEventListener('submit', async function (e) {
          e.preventDefault();

          const username = usernameInput.value.trim();
          const email = emailInput.value.trim();
          const password = passwordInput.value;
          const confirm = confirmInput.value;
          const agree = agreeInput.checked;

          let hasErr = false;
          if (!window.isValidUsername(username)) {
            window.setFieldError(usernameInput, usernameError, true);
            hasErr = true;
          } else {
            window.setFieldError(usernameInput, usernameError, false);
          }
          if (!email || !window.isValidEmail(email)) {
            window.setFieldError(emailInput, emailError, true);
            hasErr = true;
          } else {
            window.setFieldError(emailInput, emailError, false);
          }
          if (!password || password.length < 6) {
            window.setFieldError(passwordInput, passwordError, true);
            hasErr = true;
          } else {
            window.setFieldError(passwordInput, passwordError, false);
          }
          if (password !== confirm) {
            window.setFieldError(confirmInput, confirmError, true);
            hasErr = true;
          } else {
            window.setFieldError(confirmInput, confirmError, false);
          }
          if (!agree) {
            termsError.classList.add('show');
            hasErr = true;
          } else {
            termsError.classList.remove('show');
          }

          if (hasErr) {
            window.showToast('Perbaiki input yang salah.', 'error');
            return;
          }

          window.setLoading(registerBtn, true, '<span class="spinner"></span> Mendaftar...');

          try {
            await window.registerUser(email, password, username);
            window.showToast('Registrasi berhasil!', 'success');

            if (successEmail) successEmail.textContent = email;
            if (registerCard) registerCard.style.display = 'none';
            if (authHead) authHead.style.display = 'none';
            if (authFoot) authFoot.style.display = 'none';
            if (successCard) successCard.classList.add('show');

          } catch (err) {
            window.showToast(err.message || 'Gagal mendaftar.', 'error');
            window.setLoading(registerBtn, false, "<i class='bx bx-user-plus'></i> Daftar Gratis");
          }
        });
      }

      if (googleBtn) {
        googleBtn.addEventListener('click', async function () {
          try {
            await window.loginGoogle();
          } catch (err) {
            window.showToast(err.message || 'Gagal daftar Google.', 'error');
          }
        });
      }

      /* Resend email */
      const resendBtn = document.getElementById('resendEmailBtn');
      if (resendBtn && emailInput) {
        resendBtn.addEventListener('click', async function () {
          const email = emailInput.value.trim() || (successEmail ? successEmail.textContent : '');
          if (!email || !window.isValidEmail(email)) {
            window.showToast('Email tidak valid.', 'error');
            return;
          }
          try {
            await window.registerUser(email, passwordInput.value || 'temp123456', usernameInput.value.trim() || 'user');
            window.showToast('Email verifikasi dikirim ulang.', 'success');
          } catch (err) {
            window.showToast('Gagal kirim ulang: ' + (err.message || ''), 'error');
          }
        });
      }
    }

    /* Forgot password form */
    if (page === 'forgot-password') {
      const form = document.getElementById('forgotForm');
      const emailInput = document.getElementById('email');
      const emailError = document.getElementById('emailError');
      const forgotBtn = document.getElementById('forgotBtn');
      const forgotCard = document.getElementById('forgotCard');
      const successCard = document.getElementById('successCard');
      const successEmail = document.getElementById('successEmail');
      const authHead = document.getElementById('authHead');
      const authFoot = document.getElementById('authFoot');

      if (form) {
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          const email = emailInput.value.trim();

          if (!email || !window.isValidEmail(email)) {
            window.setFieldError(emailInput, emailError, true);
            return;
          }
          window.setFieldError(emailInput, emailError, false);

          window.setLoading(forgotBtn, true, '<span class="spinner"></span> Mengirim...');

          try {
            await window.sendResetPassword(email);
            window.showToast('Link reset password terkirim.', 'success');

            if (successEmail) successEmail.textContent = email;
            if (forgotCard) forgotCard.style.display = 'none';
            if (authHead) authHead.style.display = 'none';
            if (authFoot) authFoot.style.display = 'none';
            if (successCard) successCard.classList.add('show');
          } catch (err) {
            window.showToast(err.message || 'Gagal mengirim.', 'error');
            window.setLoading(forgotBtn, false, "<i class='bx bx-envelope'></i> Kirim Link Reset");
          }
        });
      }
    }
  });
})();
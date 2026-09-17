/* =========================================================
   NOERZ ACTIVATOR — admin.js
   Logic: statistik, verifikasi pembayaran, kelola user
   ========================================================= */

(function() {
  'use strict';
  
  document.addEventListener('DOMContentLoaded', async function() {
    const page = document.body.dataset.page;
    if (page !== 'admin') return;
    
    await new Promise(function(r) { setTimeout(r, 400); });
    
    loadStats();
    loadPendingPayments();
    loadUsers();
    
    /* Search */
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
      let t = null;
      searchInput.addEventListener('input', function() {
        clearTimeout(t);
        t = setTimeout(function() {
          loadUsers(searchInput.value.trim());
        }, 400);
      });
    }
    
    /* Logout */
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        window.logoutUser();
      });
    }
  });
  
  function getSB() {
    if (!window.supabase) return null;
    if (SUPABASE_URL.indexOf('YOUR-PROJECT') !== -1) return null;
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  
  /* ============ STATS ============ */
  async function loadStats() {
    const sb = getSB();
    if (!sb) return;
    
    try {
      const { count: totalUsers } = await sb
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      const { count: totalActivations } = await sb
        .from('activations')
        .select('*', { count: 'exact', head: true });
      
      const { count: pendingCount } = await sb
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { data: paidPayments } = await sb
        .from('payments')
        .select('amount')
        .eq('status', 'paid');
      
      let totalRevenue = 0;
      if (paidPayments && paidPayments.length) {
        paidPayments.forEach(function(p) {
          totalRevenue += Number(p.amount) || 0;
        });
      }
      
      const elUsers = document.getElementById('statTotalUsers');
      const elActivations = document.getElementById('statTotalActivations');
      const elRevenue = document.getElementById('statRevenue');
      const elPending = document.getElementById('statPending');
      
      if (elUsers) elUsers.textContent = totalUsers || 0;
      if (elActivations) elActivations.textContent = totalActivations || 0;
      if (elRevenue) elRevenue.textContent = formatRupiah(totalRevenue);
      if (elPending) elPending.textContent = pendingCount || 0;
    } catch (err) {}
  }
  
  /* ============ PENDING PAYMENTS ============ */
  async function loadPendingPayments() {
    const list = document.getElementById('paymentList');
    if (!list) return;
    
    const sb = getSB();
    if (!sb) {
      list.innerHTML = '<div class="empty-state"><i class="bx bx-inbox"></i><p>Supabase belum dikonfigurasi</p></div>';
      return;
    }
    
    try {
      const { data, error } = await sb
        .from('payments')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (error || !data || !data.length) {
        list.innerHTML = '<div class="empty-state"><i class="bx bx-inbox"></i><p>Tidak ada pembayaran pending</p></div>';
        return;
      }
      
      list.innerHTML = '';
      data.forEach(function(payment) {
        list.appendChild(createPaymentItem(payment));
      });
    } catch (err) {}
  }
  
  function createPaymentItem(payment) {
    const tier = window.getTierById(payment.tier);
    
    const div = document.createElement('div');
    div.className = 'payment-item';
    
    div.innerHTML =
      '<div class="payment-item-head">' +
      '<span class="payment-item-id">' + window.escapeHtml(payment.transaction_id || '-') + '</span>' +
      '<span class="payment-item-time">' + window.timeAgo(payment.created_at) + '</span>' +
      '</div>' +
      '<div class="payment-item-detail">' +
      '<div class="payment-item-row">' +
      "<i class='bx bx-user'></i>" +
      '<span>Email: <strong>' + window.escapeHtml(payment.user_email || '-') + '</strong></span>' +
      '</div>' +
      '<div class="payment-item-row">' +
      "<i class='bx bx-package'></i>" +
      '<span>Tier: <strong>' + window.escapeHtml(tier.name) + '</strong></span>' +
      '</div>' +
      '<div class="payment-item-row">' +
      "<i class='bx bx-money'></i>" +
      '<span>Jumlah: <strong>' + formatRupiah(payment.amount) + '</strong></span>' +
      '</div>' +
      '</div>' +
      '<div class="payment-item-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" data-action="approve">' +
      "<i class='bx bx-check'></i> Verifikasi" +
      '</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="reject">' +
      "<i class='bx bx-x'></i> Tolak" +
      '</button>' +
      '</div>';
    
    div.querySelector('[data-action="approve"]').addEventListener('click', function() {
      approvePayment(payment);
    });
    div.querySelector('[data-action="reject"]').addEventListener('click', function() {
      rejectPayment(payment);
    });
    
    return div;
  }
  
  async function approvePayment(payment) {
    const sb = getSB();
    if (!sb) return;
    
    if (!confirm('Verifikasi pembayaran ' + payment.transaction_id + '?')) return;
    
    try {
      await sb.from('payments').update({
        status: 'paid',
        paid_at: new Date().toISOString()
      }).eq('id', payment.id);
      
      const tier = window.getTierById(payment.tier);
      let expiresAt = null;
      if (tier.durationDays) {
        const d = new Date();
        d.setDate(d.getDate() + tier.durationDays);
        expiresAt = d.toISOString();
      }
      
      await sb.from('profiles').update({
        tier: tier.id,
        tier_expires_at: expiresAt,
        activation_count: 0
      }).eq('id', payment.user_id);
      
      window.showToast('Pembayaran diverifikasi.', 'success');
      loadPendingPayments();
      loadStats();
    } catch (err) {
      window.showToast('Gagal: ' + err.message, 'error');
    }
  }
  
  async function rejectPayment(payment) {
    const sb = getSB();
    if (!sb) return;
    
    if (!confirm('Tolak pembayaran ' + payment.transaction_id + '?')) return;
    
    try {
      await sb.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      window.showToast('Pembayaran ditolak.', 'info');
      loadPendingPayments();
      loadStats();
    } catch (err) {
      window.showToast('Gagal: ' + err.message, 'error');
    }
  }
  
  /* ============ USERS ============ */
  async function loadUsers(search) {
    const list = document.getElementById('userList');
    if (!list) return;
    
    const sb = getSB();
    if (!sb) {
      list.innerHTML = '<div class="empty-state"><i class="bx bx-user"></i><p>Supabase belum dikonfigurasi</p></div>';
      return;
    }
    
    try {
      let query = sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
      if (search) {
        query = query.or('email.ilike.%' + search + '%,username.ilike.%' + search + '%');
      }
      
      const { data, error } = await query;
      
      if (error || !data || !data.length) {
        list.innerHTML = '<div class="empty-state"><i class="bx bx-user"></i><p>Belum ada user</p></div>';
        return;
      }
      
      list.innerHTML = '';
      data.forEach(function(user) {
        list.appendChild(createUserItem(user));
      });
    } catch (err) {}
  }
  
  function createUserItem(user) {
    const tier = window.getTierById(user.tier || 'free');
    const displayName = user.username || (user.email ? user.email.split('@')[0] : 'User');
    const initial = displayName.charAt(0).toUpperCase();
    
    const div = document.createElement('div');
    div.className = 'user-item';
    
    div.innerHTML =
      '<div class="user-avatar">' + window.escapeHtml(initial) + '</div>' +
      '<div class="user-info">' +
      '<strong>' + window.escapeHtml(displayName) + '</strong>' +
      '<span>' + window.escapeHtml(user.email || '-') + '</span>' +
      '</div>' +
      '<span class="user-tier-badge' + (tier.id === 'free' ? ' free' : '') + '">' +
      window.escapeHtml(tier.name) +
      '</span>';
    
    return div;
  }
})();
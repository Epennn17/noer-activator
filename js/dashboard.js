/* =========================================================
   NOERZ ACTIVATOR — dashboard.js
   Logic: load profile, tampil tier, riwayat, statistik
   ========================================================= */

(function() {
  'use strict';
  
  document.addEventListener('DOMContentLoaded', async function() {
    const page = document.body.dataset.page;
    if (page !== 'dashboard') return;
    
    /* Tunggu auth */
    await new Promise(function(r) { setTimeout(r, 400); });
    
    const userId = document.body.dataset.userId;
    if (!userId) return;
    
    /* Load profile */
    const profile = await window.checkAndDowngrade(userId);
    if (!profile) {
      window.showToast('Gagal load profil.', 'error');
      return;
    }
    
    renderWelcome(profile);
    renderTierCard(profile);
    loadStatistik(userId);
    loadRiwayat(userId);
    
    if (profile.downgraded) {
      window.showToast('Tier Anda telah berakhir. Kembali ke Free.', 'info');
    }
    
    /* Logout */
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        window.logoutUser();
      });
    }
  });
  
  /* ============ WELCOME ============ */
  function renderWelcome(profile) {
    const avatar = document.getElementById('userAvatar');
    const name = document.getElementById('welcomeName');
    const email = document.getElementById('welcomeEmail');
    
    const displayName = profile.username || (profile.email ? profile.email.split('@')[0] : 'User');
    const initial = displayName.charAt(0).toUpperCase();
    
    if (avatar) avatar.textContent = initial;
    if (name) name.textContent = 'Halo, ' + displayName;
    if (email) email.textContent = profile.email || document.body.dataset.userEmail || '';
  }
  
  /* ============ TIER CARD ============ */
  function renderTierCard(profile) {
    const tierId = profile.tier || 'free';
    const tier = window.getTierById(tierId);
    
    const tierName = document.getElementById('tierName');
    const tierBadge = document.getElementById('tierBadge');
    const tierStatus = document.getElementById('tierStatus');
    const tierExpiryRow = document.getElementById('tierExpiryRow');
    const tierExpiry = document.getElementById('tierExpiry');
    const tierProgress = document.getElementById('tierProgress');
    const tierProgressText = document.getElementById('tierProgressText');
    const tierProgressFill = document.getElementById('tierProgressFill');
    const tierCard = document.getElementById('tierCard');
    const tierIcon = tierCard ? tierCard.querySelector('.tier-name .bx') : null;
    
    if (tierName) tierName.textContent = tier.name;
    if (tierIcon) tierIcon.className = 'bx ' + tier.icon;
    
    const active = isTierActive(profile);
    if (tierBadge) {
      tierBadge.textContent = active ? 'Active' : 'Expired';
      tierBadge.className = 'tier-badge ' + (active ? 'active' : 'expired');
    }
    
    if (tierCard) {
      if (tierId === 'lifetime' || tierId === 'pertamax_turbo') {
        tierCard.classList.add('premium');
      } else {
        tierCard.classList.remove('premium');
      }
    }
    
    if (tierStatus) {
      if (tier.unlimited) {
        tierStatus.textContent = 'Unlimited aktivasi';
      } else {
        const used = profile.activation_count || 0;
        const total = tier.quota || 3;
        const remaining = Math.max(0, total - used);
        tierStatus.textContent = remaining + 'x aktivasi tersisa';
      }
    }
    
    if (tierExpiryRow && tierExpiry) {
      if (profile.tier_expires_at) {
        tierExpiryRow.style.display = 'flex';
        tierExpiry.textContent = window.formatDate(profile.tier_expires_at);
      } else if (tier.unlimited) {
        tierExpiryRow.style.display = 'flex';
        tierExpiry.textContent = 'Selamanya';
      } else {
        tierExpiryRow.style.display = 'none';
      }
    }
    
    if (tierProgress && tierProgressText && tierProgressFill) {
      if (tier.quota) {
        const used = profile.activation_count || 0;
        const total = tier.quota;
        const remaining = Math.max(0, total - used);
        const percent = (remaining / total) * 100;
        
        tierProgress.style.display = 'block';
        tierProgressText.textContent = remaining + ' / ' + total;
        tierProgressFill.style.width = percent + '%';
      } else {
        tierProgress.style.display = 'none';
      }
    }
  }
  
  function isTierActive(profile) {
    if (profile.tier === 'free') return true;
    if (!profile.tier_expires_at) return true;
    return new Date(profile.tier_expires_at) > new Date();
  }
  
  /* ============ RIWAYAT ============ */
  async function loadRiwayat(userId) {
    const list = document.getElementById('riwayatList');
    if (!list) return;
    if (!window.supabase) return;
    if (SUPABASE_URL.indexOf('YOUR-PROJECT') !== -1) return;
    
    try {
      const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data, error } = await sb
        .from('activations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error || !data || !data.length) {
        renderEmpty(list);
        return;
      }
      
      list.innerHTML = '';
      data.forEach(function(item) {
        list.appendChild(createItem(item));
      });
    } catch (err) {
      renderEmpty(list);
    }
  }
  
  function renderEmpty(list) {
    list.innerHTML =
      '<div class="empty-state">' +
      "<i class='bx bx-inbox'></i>" +
      '<p>Belum ada riwayat aktivasi</p>' +
      '</div>';
  }
  
  function createItem(item) {
    const div = document.createElement('div');
    div.className = 'riwayat-item';
    
    const isSuccess = item.status === 'success';
    const icon = isSuccess ? 'bx-check-circle' : 'bx-x-circle';
    const statusText = isSuccess ? 'Success' : 'Failed';
    
    div.innerHTML =
      '<div class="riwayat-icon"><i class="bx ' + icon + '"></i></div>' +
      '<div class="riwayat-text">' +
      '<strong>' + window.escapeHtml(item.email_target || '-') + '</strong>' +
      '<span>' + window.timeAgo(item.created_at) + '</span>' +
      '</div>' +
      '<span class="riwayat-status' + (isSuccess ? '' : ' failed') + '">' + statusText + '</span>';
    
    return div;
  }
  
  /* ============ STATISTIK ============ */
  async function loadStatistik(userId) {
    const statSuccess = document.getElementById('statSuccess');
    const statFailed = document.getElementById('statFailed');
    if (!statSuccess || !statFailed) return;
    if (!window.supabase) return;
    if (SUPABASE_URL.indexOf('YOUR-PROJECT') !== -1) return;
    
    try {
      const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      const { count: successCount } = await sb
        .from('activations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'success');
      
      const { count: failedCount } = await sb
        .from('activations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'failed');
      
      statSuccess.textContent = successCount || 0;
      statFailed.textContent = failedCount || 0;
    } catch (err) {}
  }
})();
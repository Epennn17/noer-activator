/* =========================================================
   NOERZ ACTIVATOR — config.js
   Config global: Supabase, API, TIERS, konstanta
   ========================================================= */

/* ===== SUPABASE ===== */
/* GANTI dengan credentials dari project Supabase Anda */
const SUPABASE_URL = 'https://pbwuzxpenwawqpcpjznl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBidnV6eHBlbndhd3FjcHFqem5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MzE2MTksImV4cCI6MjEwNTIwNzYxOX0.r-hwJOkn0rzUMdgnvNqwO5ypV3MN80O6YcfaPSTc_ok';

/* ===== ADMIN ===== */
/* GANTI dengan email admin Anda */
const ADMIN_EMAIL = 'noerholic@gmail.com';

/* ===== KONTAK ===== */
const CONTACT_EMAIL = 'noerholic@gmail.com';
const CONTACT_WA = '6289654291565';

/* ===== API ENDPOINTS ===== */
const API_BASE = 'https://api.alwayscodex.eu.cc';
const API_SEND = API_BASE + '/api/am/sendv2';
const API_VERIFY = API_BASE + '/api/am/verifv2';
const API_SOCIABUZZ_CREATE = API_BASE + '/api/payment/sociabuzz-create';
const API_SOCIABUZZ_CHECK = API_BASE + '/api/payment/sociabuzz-check';

/* ===== TIERS ===== */
const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    duration: 'Selamanya',
    durationDays: null,
    quota: 3,
    unlimited: false,
    icon: 'bx-gift',
    features: [
      '3x aktivasi',
      'Semua fitur dasar'
    ]
  },
  {
    id: 'pertalite',
    name: 'Pertalite',
    price: 3000,
    duration: '1 hari',
    durationDays: 1,
    quota: null,
    unlimited: true,
    icon: 'bx-time',
    features: [
      'Unlimited aktivasi',
      'Semua fitur',
      'Aktif 1 hari'
    ]
  },
  {
    id: 'pertamax',
    name: 'Pertamax',
    price: 8000,
    duration: '7 hari',
    durationDays: 7,
    quota: null,
    unlimited: true,
    icon: 'bx-calendar',
    features: [
      'Unlimited aktivasi',
      'Semua fitur',
      'Aktif 7 hari'
    ]
  },
  {
    id: 'pertamax_turbo',
    name: 'Pertamax Turbo',
    price: 15000,
    duration: '30 hari',
    durationDays: 30,
    quota: null,
    unlimited: true,
    icon: 'bx-rocket',
    popular: true,
    features: [
      'Unlimited aktivasi',
      'Semua fitur',
      'Aktif 30 hari'
    ]
  }
];

/* ===== HELPER TIER ===== */
function getTierById(id) {
  return TIERS.find(function (t) { return t.id === id; }) || TIERS[0];
}

function formatRupiah(num) {
  if (!num) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}
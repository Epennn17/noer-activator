/* =========================================================
   Noerz Activator — Backend Proxy for Vercel
   Endpoint: /api/proxy
   Meneruskan request ke API target, bypass CORS browser.
   ========================================================= */

export default async function handler(req, res) {
  // ===== CORS Headers =====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ===== Handle Preflight (OPTIONS) =====
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ===== Hanya izinkan POST =====
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    // Ambil body dari client
    const body = req.body || {};
    const { url, ...payload } = body;

    // Validasi: url wajib ada
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        status: false,
        error: 'Parameter "url" wajib diisi.'
      });
    }

    // Whitelist domain (biar tidak jadi open proxy)
    const allowedHosts = [
      'api.alwayscodex.eu.cc'
    ];

    let targetHost;
    try {
      targetHost = new URL(url).host;
    } catch (e) {
      return res.status(400).json({
        status: false,
        error: 'URL tidak valid.'
      });
    }

    if (!allowedHosts.includes(targetHost)) {
      return res.status(403).json({
        status: false,
        error: 'Domain tidak diizinkan.'
      });
    }

    // ===== Teruskan request ke API target =====
    const controller = new AbortController();
    const timeoutId = setTimeout(function () {
      controller.abort();
    }, 25000); // 25 detik

    let apiRes;
    try {
      apiRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({
          status: false,
          error: 'Request ke server target timeout.'
        });
      }
      return res.status(502).json({
        status: false,
        error: 'Gagal terhubung ke server target.'
      });
    }

    // ===== Baca response dari API =====
    const text = await apiRes.text();

    // Set status & kirim balik
    res.status(apiRes.status);

    // Coba parse sebagai JSON
    try {
      const json = JSON.parse(text);
      return res.json(json);
    } catch (e) {
      // Kalau bukan JSON, kirim sebagai text
      return res.send(text);
    }

  } catch (err) {
    return res.status(500).json({
      status: false,
      error: 'Terjadi kesalahan pada proxy server.',
      detail: err.message
    });
  }
      }

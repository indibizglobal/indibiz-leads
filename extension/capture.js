'use strict';

function isGoogleMapsUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && /^(www\.)?google\.(com|co\.id)$/.test(u.hostname) && /^\/maps(?:\/|$)/.test(u.pathname);
  } catch { return false; }
}

// Self-contained: Chrome serializes this function into the active tab's isolated world.
// No fetch, hidden app state, scrolling, list iteration, or automatic capture.
function readMapsDetail() {
  const fail = (code, message) => ({error: {code, message}});
  try {
    if (location.protocol !== 'https:' || !/^(www\.)?google\.(com|co\.id)$/.test(location.hostname) || !/^\/maps(?:\/|$)/.test(location.pathname))
      return fail('NOT_MAPS', 'Tab aktif bukan Google Maps.');
    if (!/^\/maps\/place\/[^/]+/.test(location.pathname))
      return fail('NOT_DETAIL', 'Buka satu profil bisnis, bukan hanya daftar hasil pencarian Maps.');
    const visible = el => el && !el.closest('[hidden], [aria-hidden="true"], [role="feed"]') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const headings = [...document.querySelectorAll('[role="main"] h1, main h1, h1.DUwDvf')].filter(visible);
    if (headings.length !== 1)
      return fail('NO_NAME', 'Tidak menemukan satu nama bisnis pada profil yang sedang dibuka. Tunggu profil selesai dimuat.');
    const heading = headings[0], root = heading.closest('[role="main"], main');
    if (!root || root.matches('[aria-busy="true"]') || [...root.querySelectorAll('[role="progressbar"]')].some(visible))
      return fail('LOADING', 'Profil bisnis belum selesai dimuat. Tunggu sebentar lalu coba lagi.');
    const clean = value => String(value || '').replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();
    const name = clean(heading.textContent);
    if (!name || /^(hasil|results|google maps)$/i.test(name))
      return fail('NO_NAME', 'Tidak menemukan nama bisnis pada profil yang sedang dibuka.');
    const first = selectors => {
      for (const selector of selectors) {
        const el = [...root.querySelectorAll(selector)].find(visible);
        if (el) return el;
      }
      return null;
    };
    const phoneEl = first(['[data-item-id^="phone:tel:"]', 'a[href^="tel:"]', 'button[aria-label^="Telepon:"]', 'button[aria-label^="Phone:"]']);
    const phoneRaw = phoneEl?.getAttribute('data-item-id')?.replace(/^phone:tel:/, '') || phoneEl?.getAttribute('href')?.replace(/^tel:/, '') || phoneEl?.getAttribute('aria-label')?.replace(/^(Telepon|Phone):\s*/i, '') || '';
    const phone = /^[+\d\s().-]+$/.test(phoneRaw) ? phoneRaw.replace(/[^\d+]/g, '') : '';
    const addressEl = first(['[data-item-id="address"]', 'button[aria-label^="Alamat:"]', 'button[aria-label^="Address:"]']);
    const address = clean(addressEl?.getAttribute('aria-label')?.replace(/^(Alamat|Address):\s*/i, '') || addressEl?.textContent);
    const websiteEl = first(['a[data-item-id="authority"]', 'a[aria-label^="Situs:"]', 'a[aria-label^="Situs web:"]', 'a[aria-label^="Website:"]']);
    let website = '';
    if (websiteEl) {
      try {
        const u = new URL(websiteEl.href);
        if (/^https?:$/.test(u.protocol) && !u.username && !u.password) website = u.href;
      } catch { /* Missing/invalid website is optional, never guessed. */ }
    }
    const categoryEl = first(['button[jsaction*="category"]', '[data-item-id="category"]', 'button[aria-label^="Kategori:"]', 'button[aria-label^="Category:"]']);
    const category = clean(categoryEl?.getAttribute('aria-label')?.replace(/^(Kategori|Category):\s*/i, '') || categoryEl?.textContent);
    const city = address.match(/(?:^|,\s*)(?:Kota|Kabupaten|Kab\.)\s+([^,\d]+)/i)?.[1]?.trim() || '';
    return {name, phone, address, category, website, maps: location.href.split('#')[0], city, consent: 'none', status: 'Baru', notes: ''};
  } catch {
    return fail('DOM_ERROR', 'Struktur profil Maps tidak dapat dibaca. Muat ulang profil atau isi prospek secara manual.');
  }
}

if (typeof module !== 'undefined') module.exports = {isGoogleMapsUrl, readMapsDetail};

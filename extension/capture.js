// Executed only after the operator clicks Read, on the active Maps detail page.
function readMapsDetail() {
  if (!/^www\.google\.(com|co\.id)$/.test(location.hostname) || !location.pathname.startsWith('/maps')) throw Error('Buka Google Maps terlebih dahulu.');
  const heading = document.querySelector('h1.DUwDvf') || document.querySelector('[role="main"] h1');
  if (!heading || !location.pathname.includes('/place/')) throw Error('Buka satu profil bisnis, bukan daftar hasil pencarian.');
  const text = selector => document.querySelector(selector)?.textContent?.trim() || '';
  const phoneEl = document.querySelector('[data-item-id^="phone:tel:"]');
  return {
    name: heading.textContent.trim(),
    phone: phoneEl?.getAttribute('data-item-id')?.replace(/^phone:tel:/, '') || '',
    address: text('[data-item-id="address"] .Io6YTe') || text('[data-item-id="address"]'),
    category: text('button[jsaction*="category"]'),
    website: document.querySelector('a[data-item-id="authority"]')?.href || '',
    maps: location.href.split('?')[0],
    city: '', consent: 'none', status: 'Baru', notes: ''
  };
}

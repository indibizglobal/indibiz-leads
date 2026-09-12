(function (root) {
  'use strict';
  const statuses = ['Baru', 'Terverifikasi', 'Dihubungi', 'Tertarik', 'Survei', 'Pelanggan', 'Tidak berminat'];
  const clean = (s, max = 2000) => String(s ?? '').trim().slice(0, max);
  function phone(value) {
    let p = clean(value).replace(/[\s().-]/g, '');
    if (!/^\+?\d+$/.test(p)) return '';
    const international = p.startsWith('+') || p.startsWith('00');
    p = p.replace(/^\+/, '').replace(/^00/, '');
    if (!international && p.startsWith('0')) p = '62' + p.slice(1);
    else if (!international && p.startsWith('8')) p = '62' + p;
    return /^[1-9]\d{7,14}$/.test(p) ? p : '';
  }
  function url(value) {
    if (!value) return '';
    try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; }
  }
  function empty() { return { version: 1, leads: [], blocked: [], settings: { sender: '', business: '', template: 'Halo Bapak/Ibu {nama}, saya {sales} dari {bisnis}. Sesuai persetujuan melalui {sumber}, saya ingin menyampaikan informasi IndiBiz untuk {wilayah}. Apakah berkenan membahas kebutuhan internet bisnis Anda? Balas STOP bila tidak ingin dihubungi lagi.' } }; }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)) return false;
    if (value.includes('T') && (+value.slice(11,13) > 23 || +value.slice(14,16) > 59 || (value[16] === ':' && +value.slice(17,19) > 59))) return false;
    const day = value.slice(0, 10), parsed = Date.parse(day);
    return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === day && Number.isFinite(Date.parse(value));
  }
  function normalize(input) {
    const name = clean(input.name, 160);
    if (!name) throw Error('Nama bisnis wajib diisi.');
    const p = phone(input.phone);
    if (clean(input.phone) && !p) throw Error('Nomor telepon tidak valid. Contoh: 081234567890.');
    const consent = ['none', 'yes', 'revoked'].includes(input.consent) ? input.consent : 'none';
    const consentSource = clean(input.consentSource, 500);
    const consentAt = clean(input.consentAt, 50);
    if (consentAt && (!validDate(consentAt) || Date.parse(consentAt) > Date.now())) throw Error('Waktu persetujuan tidak valid atau berada di masa depan.');
    if (consent === 'yes' && (!p || !consentSource || !consentAt)) throw Error('Izin WhatsApp membutuhkan nomor, sumber/bukti, dan waktu persetujuan yang valid (bukan masa depan).');
    const followup = clean(input.followup, 10);
    if (followup && (!/^\d{4}-\d{2}-\d{2}$/.test(followup) || !Number.isFinite(Date.parse(followup)) || new Date(followup).toISOString().slice(0, 10) !== followup)) throw Error('Tanggal follow-up tidak valid.');
    return {name, phone: p, category: clean(input.category, 100), city: clean(input.city, 120), address: clean(input.address, 500), website: url(input.website), maps: url(input.maps), notes: clean(input.notes, 5000), status: statuses.includes(input.status) ? input.status : 'Baru', consent, consentSource, consentAt, followup};
  }
  const key = s => clean(s).toLocaleLowerCase('id').replace(/\s+/g, ' ');
  function duplicate(leads, lead, exclude) {
    return leads.find(x => x.id !== exclude && ((lead.phone && x.phone === lead.phone) || (lead.maps && x.maps === lead.maps) || (key(x.name) === key(lead.name) && key(x.city) === key(lead.city) && key(x.address) === key(lead.address))));
  }
  function save(state, input, id, expectedRevision) {
    const old = state.leads.find(x => x.id === id);
    if (old?.phone && input.phone === old.phone) input = {...input, phone: '+' + old.phone};
    const changedPhone = old && old.phone !== phone(input.phone);
    const lead = normalize(changedPhone ? {...input, consent: input.consent === 'revoked' ? 'revoked' : 'none', consentAt: '', consentSource: ''} : input);
    if (id && !old) throw Error('Prospek sudah dihapus. Muat ulang daftar.');
    if (old && old.revision !== expectedRevision) throw Error('Prospek berubah di tab lain. Buka ulang sebelum menyimpan.');
    const dupe = duplicate(state.leads, lead, id);
    if (dupe) throw Error('Duplikat terdeteksi: ' + dupe.name + '. Edit prospek tersebut; nomor bersama antar cabang perlu ditinjau manual.');
    if (lead.phone && state.blocked.includes(lead.phone) && lead.consent === 'yes') throw Error('Nomor ini berada di daftar jangan hubungi.');
    const now = new Date().toISOString();
    if (old?.consent === 'revoked') lead.consent = 'revoked';
    if (lead.consent === 'revoked' && lead.phone && !state.blocked.includes(lead.phone)) state.blocked.push(lead.phone);
    const record = {...lead, id: old?.id || crypto.randomUUID(), revision: (old?.revision || 0) + 1, createdAt: old?.createdAt || now, updatedAt: now, history: [...(old?.history || []), {at: now, action: old ? 'Diperbarui' : 'Ditambahkan', consent: lead.consent, source: lead.consentSource, consentAt: lead.consentAt}]};
    state.leads = old ? state.leads.map(x => x.id === id ? record : x) : [record, ...state.leads];
    return record;
  }
  function eligible(state, lead) { return Boolean(lead && phone('+' + lead.phone) === lead.phone && lead.consent === 'yes' && clean(lead.consentSource) && validDate(lead.consentAt) && Date.parse(lead.consentAt) <= Date.now() && !state.blocked.includes(lead.phone) && lead.status !== 'Tidak berminat'); }
  function matches(lead, query) {
    const q = clean(query).toLocaleLowerCase('id');
    return !q || [lead.name, lead.phone, lead.city, lead.category].join(' ').toLocaleLowerCase('id').includes(q) || Boolean(phone(q) && phone(q) === lead.phone);
  }
  function previewSnapshot(state, lead) {
    return {id: lead.id, record: JSON.stringify(lead), settings: JSON.stringify(state.settings)};
  }
  function previewLead(state, snapshot) {
    const lead = state.leads.find(x => x.id === snapshot?.id);
    if (!eligible(state, lead) || snapshot.record !== JSON.stringify(lead) || snapshot.settings !== JSON.stringify(state.settings)) throw Error('Data penerima, izin, atau identitas berubah. Tutup dan buat preview baru. Draf tidak dibuka.');
    return lead;
  }
  function draft(state, lead) {
    const vals = {nama: lead.name, sales: state.settings.sender, bisnis: state.settings.business, wilayah: lead.city || 'wilayah Anda', sumber: lead.consentSource};
    return state.settings.template.replace(/\{(nama|sales|bisnis|wilayah|sumber)\}/g, (_, k) => vals[k]);
  }
  function merge(state, backup) {
    if (backup?.version !== 1 || !Array.isArray(backup.leads) || !Array.isArray(backup.blocked) || backup.leads.length > 20000) throw Error('Format backup tidak didukung (versi 1, maksimal 20.000 prospek).');
    const incoming = backup.leads.map(x => normalize({...x, phone: x.id && x.phone ? '+' + x.phone : x.phone}));
    const blocked = backup.blocked.map(x => phone('+' + x));
    if (blocked.some(x => !x)) throw Error('Backup berisi nomor blokir tidak valid.');
    for (const lead of incoming) if (lead.consent === 'revoked' && lead.phone) blocked.push(lead.phone);
    state.blocked = [...new Set([...state.blocked, ...blocked])];
    let added = 0, skipped = 0;
    for (const lead of incoming) {
      if (state.blocked.includes(lead.phone)) lead.consent = 'revoked';
      if (duplicate(state.leads, lead)) { skipped++; continue; }
      save(state, {...lead, phone: lead.phone ? '+' + lead.phone : ''}); added++;
    }
    state.leads = state.leads.map(x => state.blocked.includes(x.phone) ? {...x, consent: 'revoked', revision: x.revision + 1} : x);
    return {added, skipped};
  }
  function validateState(value) {
    const fail = () => { throw Error('Data penyimpanan/backup tidak valid. Data lama tidak diubah; periksa file backup.'); };
    if (!value || value.version !== 1 || !Array.isArray(value.leads) || !Array.isArray(value.blocked) || value.leads.length > 20000 || !value.settings) fail();
    for (const [key, max] of [['sender',120],['business',160],['template',3000]]) if (typeof value.settings[key] !== 'string' || value.settings[key].length > max) fail();
    if (value.blocked.some(p => typeof p !== 'string' || !p || phone('+' + p) !== p)) fail();
    const ids = new Set();
    for (const lead of value.leads) {
      if (!lead || typeof lead.id !== 'string' || !lead.id || ids.has(lead.id) || !Number.isSafeInteger(lead.revision) || lead.revision < 1 || !validDate(lead.createdAt) || !validDate(lead.updatedAt) || !Array.isArray(lead.history)) fail();
      ids.add(lead.id);
      const normalized = normalize({...lead, phone: lead.phone ? '+' + lead.phone : ''});
      for (const key of Object.keys(normalized)) if (lead[key] !== normalized[key]) fail();
      for (const event of lead.history) if (!event || !validDate(event.at) || typeof event.action !== 'string' || !['none','yes','revoked'].includes(event.consent) || typeof event.source !== 'string' || typeof event.consentAt !== 'string' || (event.consentAt && !validDate(event.consentAt))) fail();
    }
    return value;
  }
  function restore(state, backup) {
    const restored = structuredClone(validateState(backup));
    restored.blocked = [...new Set([...state.blocked, ...restored.blocked, ...state.leads.filter(l => l.consent === 'revoked' && l.phone).map(l => l.phone), ...restored.leads.filter(l => l.consent === 'revoked' && l.phone).map(l => l.phone)])];
    for (const lead of restored.leads) if (restored.blocked.includes(lead.phone) && lead.consent !== 'revoked') {
      lead.consent = 'revoked'; lead.revision++; lead.updatedAt = new Date().toISOString();
      lead.history.push({at: lead.updatedAt, action: 'Blokir dipertahankan saat pemulihan', consent: 'revoked', source: lead.consentSource, consentAt: lead.consentAt});
    }
    Object.assign(state, {version: 1, leads: restored.leads, blocked: restored.blocked, settings: restored.settings});
    return {restored: restored.leads.length};
  }
  const api = {statuses, clean, phone, url, empty, validDate, normalize, duplicate, save, eligible, draft, merge, matches, previewSnapshot, previewLead, validateState, restore};
  root.Prospek = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);

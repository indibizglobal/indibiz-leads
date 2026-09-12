'use strict';
const C = Prospek, $ = id => document.getElementById(id), KEY = 'prospek-local-v1';
const extension = Boolean(globalThis.chrome?.storage?.local);
let state = C.empty(), page = 0, editing = null, revision = null, previewState = null;
const fields = ['name','phone','category','city','address','website','maps','status','followup','consent','consentAt','consentSource','notes'];
async function read() {
  const value = extension ? (await chrome.storage.local.get(KEY))[KEY] : JSON.parse(localStorage.getItem(KEY) || 'null');
  return value == null ? C.empty() : C.validateState(value);
}
async function mutate(fn) {
  return navigator.locks.request(KEY, async () => {
    const current = await read();
    const result = fn(current);
    C.validateState(current);
    if (extension) await chrome.storage.local.set({[KEY]: current});
    else localStorage.setItem(KEY, JSON.stringify(current));
    state = current; render(); return result;
  });
}
function notice(message, error = false) { $('notice').textContent = message; $('notice').className = error ? 'error' : ''; $('notice').hidden = false; if (error && $('preview').open) $('previewError').textContent = message; }
function element(tag, text, className) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el; }
function action(text, fn, className = 'secondary') { const b = element('button', text, className); b.type = 'button'; b.addEventListener('click', () => safely(fn)); return b; }
async function safely(fn) { try { await fn(); } catch (e) { notice(e.message || 'Tindakan gagal. Silakan coba lagi.', true); } }
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function due(lead) { return lead.followup && lead.followup <= today() && !['Pelanggan','Tidak berminat'].includes(lead.status) && lead.consent !== 'revoked' && !state.blocked.includes(lead.phone); }
function openExternal(url) { if (!C.url(url)) throw Error('Tautan tidak valid.'); if (extension) return chrome.tabs.create({url}); window.open(url, '_blank', 'noopener,noreferrer'); }
function render() {
  $('total').textContent = state.leads.length;
  $('ready').textContent = state.leads.filter(l => C.eligible(state,l)).length;
  $('due').textContent = state.leads.filter(due).length;
  const q = $('filter').value.toLocaleLowerCase('id'), status = $('statusFilter').value, queue = $('queueFilter').value;
  const leads = state.leads.filter(l => C.matches(l,q) && (!status || l.status === status) && (!queue || (queue === 'ready' ? C.eligible(state,l) : queue === 'due' ? due(l) : state.blocked.includes(l.phone) || l.consent === 'revoked')));
  const pages = Math.max(1, Math.ceil(leads.length/20)); page = Math.min(page, pages-1);
  $('count').textContent = `${leads.length} prospek ditampilkan • tersimpan hanya di browser ini`;
  $('list').replaceChildren();
  if (!leads.length) { const box = element('div', undefined, 'empty'); box.append(element('strong',state.leads.length ? 'Tidak ada yang cocok' : 'Prospek pertamamu dimulai di sini'),element('p',state.leads.length ? 'Ubah kata pencarian atau filter.' : 'Cari bisnis di Maps atau tambahkan kontak secara manual.')); $('list').append(box); }
  for (const lead of leads.slice(page*20,page*20+20)) {
    const row = element('article', undefined, 'lead'), info = element('div'), buttons = element('div', undefined, 'actions');
    info.append(element('h3',lead.name),element('p',[lead.category,lead.city].filter(Boolean).join(' · ') || 'Kategori / wilayah belum diisi'),element('p',lead.phone ? '+' + lead.phone : 'Nomor belum tersedia'));
    info.append(element('span',lead.status,'badge'));
    const blocked = state.blocked.includes(lead.phone) || lead.consent === 'revoked';
    info.append(element('span',blocked ? 'Jangan hubungi' : C.eligible(state,lead) ? 'Izin WhatsApp tercatat' : 'Belum siap WhatsApp', 'badge ' + (blocked ? 'stop' : C.eligible(state,lead) ? 'good' : '')));
    if (lead.followup) info.append(element('p',`Follow-up: ${lead.followup}${due(lead) ? ' • jatuh tempo' : ''}`));
    buttons.append(action('Detail / edit',()=>edit(lead)));
    const wa = action('Draf WhatsApp',()=>preview(lead.id)); wa.disabled = !C.eligible(state,lead); wa.title = wa.disabled ? 'Perlu nomor, izin, sumber, dan waktu persetujuan; nomor tidak boleh diblokir.' : 'Preview sebelum membuka WhatsApp'; buttons.append(wa);
    if (lead.maps) buttons.append(action('Maps ↗',()=>openExternal(lead.maps)));
    if (!blocked) buttons.append(action('Jangan hubungi',async()=>{
      if (!confirm(`Tandai ${lead.name} sebagai jangan hubungi? Nomor tetap diblokir walaupun prospek dihapus.`)) return;
      await mutate(s=>{const l=s.leads.find(x=>x.id===lead.id); if(!l) throw Error('Prospek tidak ditemukan.'); C.save(s,{...l,phone:l.phone ? '+'+l.phone : '',consent:'revoked',status:'Tidak berminat'},l.id,l.revision);}); notice('Prospek ditandai jangan hubungi.');
    }));
    buttons.append(action('Hapus',async()=>{if(!confirm(`Hapus prospek ${lead.name}? Buat backup dahulu bila diperlukan. Daftar blokir tetap dipertahankan.`))return; await mutate(s=>{s.leads=s.leads.filter(x=>x.id!==lead.id);});notice('Prospek dihapus; daftar jangan hubungi tetap tersimpan.');}));
    row.append(info,buttons);$('list').append(row);
  }
  $('pageInfo').textContent = `${page+1} / ${pages}`; $('prev').disabled = page === 0; $('next').disabled = page >= pages-1;
}
function edit(lead = {}) {
  editing = lead.id || null; revision = lead.revision || null;
  $('leadForm').reset(); $('formError').textContent = ''; $('editorTitle').textContent = editing ? 'Detail prospek' : 'Review prospek baru';
  for (const key of fields) {
    let value = lead[key] || (key === 'status' ? 'Baru' : key === 'consent' ? 'none' : '');
    if (key === 'phone' && value) value = '+' + value;
    if(key === 'consentAt' && value) { const date = new Date(value); if(Number.isFinite(+date)) value = new Date(+date-date.getTimezoneOffset()*60000).toISOString().slice(0,16); }
    $('leadForm').elements.namedItem(key).value=value;
  }
  $('leadForm').elements.consent.disabled = lead.consent === 'revoked' || state.blocked.includes(lead.phone);
  if ($('leadForm').elements.consent.disabled) $('leadForm').elements.consent.value='revoked';
  $('editor').showModal();
}
async function preview(id) {
  state = await read(); const lead = state.leads.find(x=>x.id===id);
  if (!C.eligible(state,lead)) throw Error('Prospek tidak memenuhi syarat WhatsApp atau sudah diblokir.');
  if (!state.settings.sender || !state.settings.business) { setView('settings'); throw Error('Isi nama sales dan badan usaha di Pesan & identitas terlebih dahulu.'); }
  previewState = C.previewSnapshot(state,lead); $('previewError').textContent=''; $('recipient').textContent = `${lead.name} • +${lead.phone}`; $('message').value=C.draft(state,lead); $('preview').showModal();
}
function setView(view) { document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==view); document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('selected',el.dataset.view===view)); if(view==='settings') for(const k of ['sender','business','template']) $('settingsForm').elements.namedItem(k).value=state.settings[k]; }
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
for(const status of C.statuses) { $('statusFilter').append(new Option(status,status)); $('leadForm').elements.status.append(new Option(status,status)); }
for(const id of ['filter','statusFilter','queueFilter']) $(id).addEventListener('input',()=>{page=0;render();});
$('prev').onclick=()=>{page--;render();}; $('next').onclick=()=>{page++;render();}; $('add').onclick=()=>edit();
$('wide').onclick=()=>safely(()=>openExternal(extension?chrome.runtime.getURL('index.html'):location.href));
// Extension pages use a chrome-extension URL, not an external web URL.
if(extension) $('wide').onclick=()=>safely(()=>chrome.tabs.create({url:chrome.runtime.getURL('index.html')}));
else $('wide').hidden=true;
$('searchMaps').onsubmit=e=>{e.preventDefault();safely(()=>openExternal('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent($('searchCategory').value+' di '+$('searchCity').value)));};
$('capture').onclick=()=>safely(async()=>{
  if(!extension) throw Error('Pembacaan Maps tersedia setelah ekstensi dipasang. Mode pratinjau ini mendukung input manual.');
  const button=$('capture');button.disabled=true;button.textContent='Membaca profil…';
  try {
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id) throw Error('Tab aktif tidak ditemukan.');
    let results;
    try { results=await chrome.scripting.executeScript({target:{tabId:tab.id},func:readMapsDetail}); }
    catch { throw Error('Buka satu profil bisnis Google Maps, klik ikon ekstensi pada tab itu, lalu coba lagi. Tidak bisa membaca tab dashboard atau halaman terbatas.'); }
    if(!results?.[0]?.result?.name) throw Error('Detail bisnis tidak terbaca. Buka profil bisnis atau gunakan input manual.');
    edit({...results[0].result,city:$('searchCity').value});
  } finally {button.disabled=false;button.textContent='Baca bisnis yang dibuka';}
});
$('leadForm').onsubmit=async e=>{
  e.preventDefault(); const button=e.submitter;button.disabled=true;
  try {
    const input={}; for(const k of fields) input[k]=$('leadForm').elements.namedItem(k).value;
    if(input.consentAt) { if(!C.validDate(input.consentAt)) throw Error('Waktu persetujuan tidak valid.'); input.consentAt=new Date(input.consentAt).toISOString(); }
    let changedPhone=false;
    await mutate(s=>{const old=s.leads.find(l=>l.id===editing);changedPhone=Boolean(old && old.phone!==C.phone(input.phone));return C.save(s,input,editing,revision);}); $('editor').close();notice(changedPhone ? 'Nomor berubah. Izin lama dihapus; buka detail lagi untuk mencatat izin nomor baru. Blokir tetap berlaku.' : 'Prospek tersimpan lokal. Tidak ada pesan yang dikirim.');
  } catch(error) {$('formError').textContent=error.message;} finally{button.disabled=false;}
};
$('settingsForm').onsubmit=e=>{e.preventDefault();safely(async()=>{const form=$('settingsForm');await mutate(s=>{s.settings={sender:C.clean(form.elements.sender.value,120),business:C.clean(form.elements.business.value,160),template:C.clean(form.elements.template.value,3000)};});notice('Identitas dan template tersimpan.');});};
$('openWa').onclick=()=>safely(async()=>{
  state=await read();const lead=C.previewLead(state,previewState);
  const text=$('message').value.trim();if(!text) throw Error('Pesan tidak boleh kosong.');
  await openExternal('https://web.whatsapp.com/send?phone='+encodeURIComponent(lead.phone)+'&text='+encodeURIComponent(text));
  $('preview').close();notice('Draf dibuka di WhatsApp. Belum ditandai terkirim; catat status setelah Anda mengirim sendiri.');
});
$('export').onclick=()=>safely(async()=>{
  const data=await read();const blob=new Blob([JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
  const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`prospek-lokal-${today()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);notice('Backup diunduh. File berisi kontak; simpan secara pribadi.');
});
$('import').onchange=()=>safely(async()=>{
  const file=$('import').files[0];if(!file)return;
  try{if(file.size>10*1024*1024)throw Error('Backup maksimal 10 MB.');const data=JSON.parse(await file.text());if(!confirm('Gabungkan backup? Prospek lama tidak ditimpa. Semua daftar jangan hubungi dipertahankan.'))return;const result=await mutate(s=>C.merge(s,data));notice(`${result.added} prospek ditambahkan, ${result.skipped} duplikat dilewati. Pengaturan pengirim tidak diubah.`);}finally{$('import').value='';}
});
$('restore').onchange=()=>safely(async()=>{
  const file=$('restore').files[0];if(!file)return;
  try {
    if(file.size>10*1024*1024)throw Error('Backup maksimal 10 MB.');
    const data=C.validateState(JSON.parse(await file.text()));
    if(!confirm(`Pulihkan ${data.leads.length} prospek beserta riwayat dan pengaturan? Data sekarang akan diganti. Download backup data sekarang terlebih dahulu. Semua nomor jangan hubungi tetap dipertahankan.`))return;
    const result=await mutate(s=>C.restore(s,data));notice(`${result.restored} prospek dipulihkan beserta riwayat dan pengaturan. Daftar jangan hubungi tetap dipertahankan.`);
  } finally {$('restore').value='';}
});
if(extension)chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[KEY])safely(async()=>{state=await read();render();});});
else window.addEventListener('storage',()=>safely(async()=>{state=await read();render();}));
safely(async()=>{state=await read();render();if(!extension)notice('Mode pratinjau mandiri: data terpisah dari ekstensi. Untuk membaca Maps, pasang ekstensi melalui petunjuk README.');});

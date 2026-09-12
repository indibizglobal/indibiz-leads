const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {isGoogleMapsUrl, readMapsDetail} = require('../capture');
let browser;
before(async () => { browser = await chromium.launch({channel:'msedge',headless:true}); });
after(async () => { await browser?.close(); });
async function capture(html, url='https://www.google.com/maps/place/Fixture') {
  const page = await browser.newPage();
  try {
    await page.route('**/*', route => route.fulfill({contentType:'text/html',body:html}));
    await page.goto(url);
    return await page.evaluate(readMapsDetail);
  } finally { await page.close(); }
}
test('physical manifest is BOM-free JSON, MV3, narrow permissions, existing scripts', () => {
  const root=path.resolve(__dirname,'..'), raw=fs.readFileSync(path.join(root,'manifest.json'));
  assert.notEqual(raw[0],239);
  const m=JSON.parse(raw.toString('utf8'));
  assert.equal(m.manifest_version,3);
  assert.deepEqual(m.permissions.sort(),['activeTab','scripting','sidePanel','storage'].sort());
  assert.deepEqual(m.host_permissions,['http://127.0.0.1:3000/*']);
  for(const file of [m.background.service_worker,m.side_panel.default_path,m.options_page,'capture.js','app.js','core.js']) assert.ok(fs.existsSync(path.join(root,file)));
  assert.match(m.content_security_policy.extension_pages,/script-src 'self'/);
  assert.doesNotMatch(m.content_security_policy.extension_pages,/unsafe-eval|unsafe-inline/);
});
test('Maps URL validation rejects lookalikes and restricted pages', () => {
  for(const u of ['https://www.google.com/maps/place/A','https://google.co.id/maps/place/A','https://www.google.com/maps/search/Cafe']) assert.ok(isGoogleMapsUrl(u));
  for(const u of ['chrome://extensions','chrome-extension://id/index.html','https://evilgoogle.com/maps/place/A','https://www.google.com.evil.test/maps/place/A','https://www.google.com/mapsFake','http://www.google.com/maps/place/A','garbage']) assert.equal(isGoogleMapsUrl(u),false);
});
test('semantic business detail captures fields and city without obfuscated classes', async () => {
  const r=await capture('<main><h1>Bisnis Uji</h1><button data-item-id="phone:tel:081234567890">Telepon</button><button data-item-id="address" aria-label="Alamat: Jl. Uji, Kota Kediri, Jawa Timur">icon</button><button jsaction="pane.new.category">Kafe</button><a data-item-id="authority" href="https://example.com">Website</a></main>');
  assert.equal(r.name,'Bisnis Uji');assert.equal(r.phone,'081234567890');assert.equal(r.city,'Kediri');assert.equal(r.category,'Kafe');assert.equal(r.website,'https://example.com/');assert.equal(r.consent,'none');
});
test('aria and tel fallbacks are scoped to the selected detail', async () => {
  const r=await capture('<a href="tel:099999999999">Unrelated</a><main role="main"><h1>Fallback</h1><a href="tel:+6281234567890">Call</a><button aria-label="Address: Jalan Uji">icon</button><button aria-label="Category: Cafe">icon</button><a aria-label="Website: example.com" href="https://example.com">Site</a></main>');
  assert.equal(r.phone,'+6281234567890');assert.equal(r.address,'Jalan Uji');assert.equal(r.category,'Cafe');assert.equal(r.website,'https://example.com/');assert.equal(r.city,'');
});
test('missing optional fields stay empty; arbitrary buttons are not categories', async () => {
  const r=await capture('<main><h1>No phone</h1><button>Ringkasan</button><button>4.8</button></main>');
  assert.equal(r.name,'No phone');for(const k of ['phone','website','address','category','city']) assert.equal(r[k],'');
});
test('search-only page is rejected even if it has a heading', async () => {
  const r=await capture('<main><h1>Hasil</h1></main>','https://www.google.com/maps/search/Cafe');assert.equal(r.error.code,'NOT_DETAIL');
});
test('feed headings and hidden stale details are never captured', async () => {
  const r=await capture('<main hidden><h1>Stale</h1></main><main><div role="feed"><h1>List</h1><a href="tel:099999999">Other</a></div><h1>Selected</h1></main>');assert.equal(r.name,'Selected');assert.equal(r.phone,'');
});
test('loading, absent, malformed and ambiguous headings give useful errors', async () => {
  for(const html of ['<main><p>Pending</p></main>','<main><h1></h1></main>','<main><h1>A</h1><h1>B</h1></main>']) assert.equal((await capture(html)).error.code,'NO_NAME');
  assert.equal((await capture('<main aria-busy="true"><h1>Loading</h1></main>')).error.code,'LOADING');
});
test('malicious optional URL and hidden phone are not returned', async () => {
  const r=await capture('<main><h1>Safe</h1><a data-item-id="authority" href="javascript:alert(1)">Website</a><button hidden data-item-id="phone:tel:081234567890">Hidden</button></main>');assert.equal(r.website,'');assert.equal(r.phone,'');
});
test('injected extractor contains failures in a serializable error envelope', async () => {
  const page=await browser.newPage();
  try {assert.equal((await page.evaluate(readMapsDetail)).error.code,'NOT_MAPS');} finally {await page.close();}
});
test('unexpected DOM failure returns diagnostic code without leaking exception text',async()=>{
  const page=await browser.newPage();
  try {
    await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<main><h1>Test</h1></main>'}));
    await page.goto('https://www.google.com/maps/place/Test');
    await page.evaluate(()=>{document.querySelectorAll=()=>{throw Error('Private diagnostic text');};});
    const r=await page.evaluate(readMapsDetail);assert.equal(r.error.code,'DOM_ERROR');assert.doesNotMatch(r.error.message,/Private/);
  } finally {await page.close();}
});

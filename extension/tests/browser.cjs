const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
(async()=>{
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'prospek-browser-test-'));
 const context=await chromium.launchPersistentContext(profile,{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:[`--disable-extensions-except=${root}`,`--load-extension=${root}`],viewport:{width:1366,height:960}});
 try{
  let worker=context.serviceWorkers()[0];
  if(!worker) worker=await context.waitForEvent('serviceworker',{timeout:15000}).catch(()=>null);
  const origin=worker ? worker.url().split('/').slice(0,3).join('/') : 'file:///'+root.replaceAll('\\','/');
  console.log(worker?'EXTENSION: native loaded':'EXTENSION: unavailable; standalone UI verification only');
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/index.html');
  await page.locator('#add').click();
  await page.locator('[name=name]').fill('<img src=x onerror=alert(1)> Kafe Uji');
  await page.locator('[name=phone]').fill('081234567890');
  await page.locator('[name=city]').fill('Kediri');
  await page.locator('#leadForm button[type="submit"], #leadForm button:not([type])').click();
  await page.locator('#editor').waitFor({state:'hidden'});
  assert.equal(await page.locator('#total').innerText(),'1');assert.equal(await page.locator('#list img').count(),0);
  assert.equal(await page.getByRole('button',{name:'Draf WhatsApp',exact:true}).isDisabled(),true);
  console.log('PASS save, literal untrusted text, WhatsApp consent gate');
  await page.reload();await page.waitForFunction(()=>document.querySelector('#total').textContent==='1');
  await page.getByRole('button',{name:'Detail / edit'}).click();
  await page.locator('[name=consent]').selectOption('yes');await page.locator('[name=consentAt]').fill('2026-01-01T10:00');await page.locator('[name=consentSource]').fill('Form uji #001');
  await page.locator('#leadForm button:not([type])').click();await page.locator('#editor').waitFor({state:'hidden'});
  await page.locator('[data-view=settings]').click();await page.locator('[name=sender]').fill('Sales Uji');await page.locator('[name=business]').fill('Mitra Uji');await page.getByRole('button',{name:'Simpan pengaturan'}).click();
  await page.locator('[data-view=prospects]').click();await page.getByRole('button',{name:'Draf WhatsApp',exact:true}).click();
  assert.match(await page.locator('#message').inputValue(),/Sales Uji/);
  await page.locator('[data-close=preview]').click();
  console.log('PASS persistent storage, consent editing, personalized draft');
  await page.screenshot({path:path.join(profile,'dashboard-desktop.png'),fullPage:true});
  for(const size of [{width:375,height:812},{width:812,height:375}]){await page.setViewportSize(size);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.setViewportSize({width:375,height:812});await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:path.join(profile,'dashboard-panel.png'),fullPage:true});
  console.log('PASS 375px panel, landscape, reduced motion, no horizontal overflow');
  const other=await context.newPage();await other.goto(origin+'/index.html');await other.waitForFunction(()=>document.querySelector('#total').textContent==='1');
  // Never open WhatsApp: observe attempted opens entirely in memory.
  await page.evaluate(()=>{globalThis.attemptedOpens=[];openExternal=async url=>{globalThis.attemptedOpens.push(url);};});
  await page.locator('#filter').fill('0812-3456-7890');assert.equal(await page.locator('.lead').count(),1);await page.locator('#filter').fill('');
  await page.getByRole('button',{name:'Draf WhatsApp',exact:true}).click();
  await other.getByRole('button',{name:'Detail / edit'}).click();await other.locator('[name=phone]').fill('081299999999');
  await other.locator('#leadForm button:not([type])').click();await other.locator('#editor').waitFor({state:'hidden'});
  await page.locator('#openWa').click();await page.waitForFunction(()=>document.querySelector('#previewError').textContent.includes('preview baru'));
  assert.deepEqual(await page.evaluate(()=>globalThis.attemptedOpens),[]);
  await page.locator('[data-close=preview]').click();
  await other.getByRole('button',{name:'Detail / edit'}).click();assert.equal(await other.locator('[name=consent]').inputValue(),'none');assert.equal(await other.locator('[name=consentSource]').inputValue(),'');
  await other.locator('[name=phone]').fill('081234567890');await other.locator('#leadForm button:not([type])').click();await other.locator('#editor').waitFor({state:'hidden'});
  await other.getByRole('button',{name:'Detail / edit'}).click();await other.locator('[name=consent]').selectOption('yes');await other.locator('[name=consentAt]').fill('2026-01-01T10:00');await other.locator('[name=consentSource]').fill('Form baru');await other.locator('#leadForm button:not([type])').click();await other.locator('#editor').waitFor({state:'hidden'});
  console.log('PASS formatted phone search, changed number clears consent, stale preview opens nothing and shows modal error');
  await other.getByRole('button',{name:'Detail / edit'}).click();
  page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'Jangan hubungi',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#ready').textContent==='0');
  await other.locator('[name=notes]').fill('Stale overwrite');await other.locator('#leadForm button:not([type])').click();await other.waitForFunction(()=>document.querySelector('#formError').textContent.includes('tab lain'));
  console.log('PASS cross-tab conflict prevents stale consent overwrite');
  await other.close();await page.setViewportSize({width:1366,height:960});await page.locator('[data-view=backup]').click();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download backup JSON'}).click();const download=await downloadPromise;const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(backup.blocked[0],'6281234567890');
  await page.locator('#import').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('duplikat dilewati'));
  console.log('PASS real JSON download and idempotent import with suppression');
  await page.locator('#restore').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('prospek dipulihkan'));
  const restored=await page.evaluate(async()=>JSON.parse(JSON.stringify(await read())));assert.deepEqual(restored.leads,backup.leads);assert.deepEqual(restored.settings,backup.settings);
  const bad=structuredClone(backup);bad.settings.template=42;
  await page.locator('#restore').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('tidak valid'));
  assert.deepEqual(await page.evaluate(async()=>JSON.parse(JSON.stringify(await read()))),restored);
  console.log('PASS full restore retains history/settings and invalid restore leaves storage unchanged');
  // Maps fixture: DOM selectors only; no real business data or messages.
  await context.route('https://www.google.com/maps/place/Fixture',route=>route.fulfill({contentType:'text/html',body:'<main role="main"><h1 class="DUwDvf">Bisnis Fixture</h1><button data-item-id="phone:tel:+6282222222222">Nomor</button><button data-item-id="address"><span class="Io6YTe">Jl. Uji 1</span></button><button jsaction="pane.category">Kafe</button><a data-item-id="authority" href="https://example.com">Website</a></main>'}));
  const maps=await context.newPage();await maps.goto('https://www.google.com/maps/place/Fixture');await maps.addScriptTag({path:path.join(root,'capture.js')});const result=await maps.evaluate(()=>readMapsDetail());assert.equal(result.name,'Bisnis Fixture');assert.equal(result.phone,'+6282222222222');assert.equal(result.address,'Jl. Uji 1');
  console.log('PASS Maps detail DOM extraction fixture (live Maps not verified)');
  assert.ok(worker, 'Native extension must load; standalone fallback is not a passing extension test');
  // Contract tests for the side-panel click handler. Chrome API boundary is mocked;
  // extraction above uses a real rendered DOM. No permission-grant claim is made.
  await page.evaluate(r=>{
    globalThis.captureApiOriginals={query:chrome.tabs.query,execute:chrome.scripting.executeScript};
    chrome.tabs.query=async()=>[{id:123,url:r.maps,status:'complete'}];
    chrome.scripting.executeScript=async()=>[{result:r}];
    setView('prospects');
  },result);
  try {
    await page.locator('#capture').click();await page.locator('#editor').waitFor();
    assert.equal(await page.locator('[name=name]').inputValue(),'Bisnis Fixture');
    assert.equal(await page.locator('[name=phone]').inputValue(),'+6282222222222');
    assert.equal(await page.locator('[name=city]').inputValue(),'');
    assert.equal(await page.locator('[name=consent]').inputValue(),'none');
    await page.locator('[data-close=editor]').first().click();
    await page.evaluate(()=>{chrome.tabs.query=async()=>[{id:123,url:'chrome://extensions'}];});
    await page.locator('#capture').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Tab aktif bukan Google Maps'));
    await page.evaluate(()=>{chrome.tabs.query=async()=>[{id:123}];});
    await page.locator('#capture').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Izin tab belum aktif'));
    await page.evaluate(()=>{
      chrome.tabs.query=async()=>[{id:123,url:'https://www.google.com/maps/place/Test'}];
      chrome.scripting.executeScript=async()=>[{result:{error:{code:'NO_NAME',message:'Tidak menemukan nama bisnis pada profil yang sedang dibuka.'}}}];
    });
    await page.locator('#capture').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('Tidak menemukan nama bisnis'));
    await page.evaluate(()=>{chrome.scripting.executeScript=async()=>{throw Error('Cannot access contents of the page');};});
    await page.locator('#capture').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Chrome belum mengizinkan'));
    assert.equal(await page.locator('#capture').isEnabled(),true);
    assert.equal(await page.locator('#editor').isVisible(),false);
    assert.deepEqual(await page.evaluate(async()=>JSON.parse(JSON.stringify(await read()))),restored);
    console.log('PASS capture click contract: normalized phone, no guessed city, no consent, actionable diagnostics, no data writes (Chrome API mocked)');
  } finally {
    await page.evaluate(()=>{chrome.tabs.query=captureApiOriginals.query;chrome.scripting.executeScript=captureApiOriginals.execute;delete globalThis.captureApiOriginals;});
  }
  assert.deepEqual(errors,[]);console.log('PASS no page JavaScript errors; no WhatsApp messages sent');
 }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

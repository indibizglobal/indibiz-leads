const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {readMapsDetail}=require('../capture');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage();
  await page.goto('https://www.google.com/maps/search/Alinea+Kediri?hl=id',{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForURL('**/maps/place/**',{timeout:45000});
  await page.locator('[role="main"] h1').waitFor({timeout:30000});
  await page.locator('[data-item-id="address"]').waitFor({timeout:15000});
  const r=await page.evaluate(readMapsDetail);
  assert.equal(r.error,undefined);assert.equal(r.name,'Alinea Kediri');assert.equal(r.category,'Kafe');assert.equal(r.city,'Kediri');
  for(const key of ['phone','address','website','maps']) assert.ok(r[key],key+' missing');
  console.log(JSON.stringify({liveMaps:true,namePresent:true,phonePresent:true,addressPresent:true,categoryPresent:true,websitePresent:true,cityPresent:true,stored:false,messagesSent:0}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});

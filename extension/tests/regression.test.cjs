const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
const input=(extra={})=>({name:'Fixture',phone:'081234567890',consent:'yes',consentSource:'Form uji',consentAt:'2026-01-01T00:00:00Z',...extra});
test('explicit international prefixes preserve country codes',()=>{
  for(const [raw,expected] of [['+819012345678','819012345678'],['00819012345678','819012345678'],['+85291234567','85291234567'],['+8613812345678','8613812345678']]) assert.equal(C.phone(raw),expected);
  assert.equal(C.phone('+081234567890'),'');
  const s=C.empty(),l=C.save(s,input({phone:'+819012345678'}));
  assert.ok(C.eligible(s,l));C.validateState(s);
  const edited=C.save(s,{...l,notes:'Keep country code'},l.id,l.revision);assert.equal(edited.phone,l.phone);assert.equal(edited.consent,'yes');
  const target=C.empty();C.merge(target,JSON.parse(JSON.stringify(s)));assert.equal(target.leads[0].phone,l.phone);
});
test('phone replacement clears consent even when submitted with old approval',()=>{
  const s=C.empty(),l=C.save(s,input());
  const next=C.save(s,{...l,phone:'081299999999'},l.id,l.revision);
  assert.equal(next.consent,'none');assert.equal(next.consentAt,'');assert.equal(next.consentSource,'');assert.equal(C.eligible(s,next),false);
  const approved=C.save(s,{...next,consent:'yes',consentSource:'New form',consentAt:'2026-01-02'},next.id,next.revision);assert.ok(C.eligible(s,approved));
});
test('format-only edit retains approval and blocked old number stays blocked',()=>{
  const s=C.empty(),l=C.save(s,input());
  const same=C.save(s,{...l,phone:'+62 812-3456-7890'},l.id,l.revision);assert.equal(same.consent,'yes');
  const revoked=C.save(s,{...same,consent:'revoked'},same.id,same.revision);
  C.save(s,{...revoked,phone:'081299999999'},revoked.id,revoked.revision);assert.ok(s.blocked.includes(l.phone));
});
test('preview refuses stale recipient, record, settings, deletion and suppression',()=>{
  for(const change of [s=>{s.leads[0].phone='6281299999999'},s=>{s.leads[0].notes='changed'},s=>{s.settings.sender='Changed'},s=>{s.leads=[]},s=>{s.blocked.push(s.leads[0].phone)}]){
    const s=C.empty(),l=C.save(s,input()),snapshot=C.previewSnapshot(s,l);assert.equal(C.previewLead(s,snapshot).id,l.id);change(s);assert.throws(()=>C.previewLead(s,snapshot),/preview baru/);
  }
});
test('local formatted search finds canonical phone',()=>{const s=C.empty(),l=C.save(s,input());assert.ok(C.matches(l,'0812-3456-7890'));assert.ok(C.matches(l,'+62 812 3456 7890'));assert.equal(C.matches(l,'09999999999'),false)});
test('calendar rollover and invalid times cannot approve a contact',()=>{
  for(const d of ['2026-02-31','2026-02-31T10:00:00Z','2025-02-29','2026-01-01T24:00:00Z']){assert.equal(C.validDate(d),false);assert.throws(()=>C.save(C.empty(),input({consentAt:d})),/persetujuan/)}
  assert.ok(C.validDate('2024-02-29T10:00:00+07:00'));
});
test('full restore preserves IDs, history, dates and settings',()=>{
  const original=C.empty(),l=C.save(original,input());C.save(original,{...l,notes:'second event'},l.id,l.revision);original.settings.sender='Uji';
  const target=C.empty();C.restore(target,JSON.parse(JSON.stringify(original)));assert.deepEqual(target,original);C.validateState(target);
});
test('restore cannot undo suppression and records its enforcement',()=>{
  const backup=C.empty(),l=C.save(backup,input());const target=C.empty();target.blocked.push(l.phone);
  C.restore(target,backup);assert.equal(target.leads[0].consent,'revoked');assert.equal(target.leads[0].history.length,2);assert.equal(backup.leads[0].consent,'yes');C.validateState(target);
});
test('corrupt storage or restore rejected without changing current state',()=>{
  const valid=C.empty();C.save(valid,input());
  for(const corrupt of [s=>{s.settings.template=42},s=>{s.leads[0].history={}},s=>{s.leads[0].revision='1'},s=>{s.leads.push(s.leads[0])},s=>{s.blocked=[null]},s=>{s.leads[0].createdAt='2026-02-31'}]){
    const bad=structuredClone(valid),target=structuredClone(valid);corrupt(bad);assert.throws(()=>C.restore(target,bad));assert.deepEqual(target,valid);
  }
});
test('not interested and revoked contacts stay ineligible after phone changes',()=>{
  const s=C.empty(),l=C.save(s,input({status:'Tidak berminat'}));
  assert.equal(C.eligible(s,l),false);
  const revoked=C.save(s,{...l,consent:'revoked'},l.id,l.revision);
  const changed=C.save(s,{...revoked,phone:'081299999999',consent:'yes',status:'Baru'},revoked.id,revoked.revision);
  assert.equal(changed.consent,'revoked');assert.equal(C.eligible(s,changed),false);
  assert.ok(s.blocked.includes(l.phone));assert.ok(s.blocked.includes(changed.phone));
});

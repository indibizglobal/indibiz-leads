const {test} = require('node:test');
const assert = require('node:assert/strict');
const {start} = require('../server');
test('health returns 200 on loopback; no CRM writes or public listener', async () => {
  const server = start(0);
  await new Promise(resolve => server.once('listening', resolve));
  try {
    assert.equal(server.address().address, '127.0.0.1');
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(base + '/health');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {ok:true, service:'indibiz-leads-server', message:'Server lokal aktif'});
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.equal((await fetch(base + '/leads', {method:'POST'})).status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'indibiz-leads-server',
    message: 'Server lokal aktif'
  });
});

function start(port = PORT) {
  return app.listen(port, '127.0.0.1');
}
if (require.main === module) {
  const server = start();
  server.on('listening', () => console.log('Server lokal aktif (loopback saja).'));
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? 'Port lokal sudah dipakai. Periksa /health sebelum menjalankan lagi.' : 'Server lokal gagal dimulai.');
    process.exitCode = 1;
  });
}
module.exports = {app, start};

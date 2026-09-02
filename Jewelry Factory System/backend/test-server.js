const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('ok'));
const server = app.listen(3001, () => {
  console.log('Test server running on 3001');
});
server.on('error', (e) => {
  console.error('Server error', e);
});

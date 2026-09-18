const http = require('http');

async function test() {
  try {
    // 1. Login to get token
    const loginData = JSON.stringify({ username: 'admin', password: 'password' }); // Replace with actual credentials if needed or mock token
    // Actually, I can just generate a token using jsonwebtoken since I know the JWT_SECRET from .env
    const jwt = require('jsonwebtoken');
    const dotenv = require('dotenv');
    dotenv.config();
    
    const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    
    // 2. Fetch data
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/dashboard/customer-summary?years=2026,2025&dateField=ordDate',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode !== 200) {
          console.log('Error:', data);
        } else {
          const parsed = JSON.parse(data);
          console.log(`Data length: ${parsed.data ? parsed.data.length : 0}`);
          if (parsed.data && parsed.data.length > 0) {
            console.log('First record keys:', Object.keys(parsed.data[0]));
            console.log('First record data:', parsed.data[0]);
          }
        }
      });
    });
    
    req.on('error', err => console.error(err));
    req.end();
  } catch (err) {
    console.error(err);
  }
}

test();

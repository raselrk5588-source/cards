const https = require('https');

const options = {
  hostname: 'card-ae1f3-default-rtdb.firebaseio.com',
  port: 443,
  path: '/users.json',
  method: 'DELETE'
};

const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();

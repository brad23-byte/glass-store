// Creates .env.local with a random JWT_SECRET if one does not exist yet.
const fs = require('fs');
const crypto = require('crypto');
const file = '.env.local';
if (fs.existsSync(file) && /^JWT_SECRET=.{32,}/m.test(fs.readFileSync(file, 'utf8'))) {
  console.log('.env.local already has a JWT_SECRET. Nothing to do.');
  process.exit(0);
}
const secret = crypto.randomBytes(48).toString('hex');
const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/^JWT_SECRET=.*$/m, '').trim() + '\n' : '';
fs.writeFileSync(file, `${existing}JWT_SECRET=${secret}\n`);
console.log('Created .env.local with a new JWT_SECRET.');
console.log('Optional: add Razorpay keys to .env.local to take real payments (see .env.example).');

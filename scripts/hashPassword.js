const bcrypt = require('bcrypt');

const password = process.argv[2] || process.env.PASSWORD || 'YOUR_PASSWORD_HERE'; // Pass password via CLI arg or env var
const saltRounds = 10; // Number of salt rounds for hashing

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
    } else {
        console.log('Hashed password:', hash);
    }
});
const bcrypt = require('bcrypt');

const password = 'Maheshwari@123'; // Replace with your desired password
const saltRounds = 10; // Number of salt rounds for hashing

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
    } else {
        console.log('Hashed password:', hash);
    }
});
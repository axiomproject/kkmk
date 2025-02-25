const bcrypt = require('bcryptjs');

const password = 'admin123';

bcrypt.hash(password, 10)
  .then(hash => {
    console.log('Use this hash in your SQL:');
    console.log(hash);
  })
  .catch(err => console.error('Error generating hash:', err));

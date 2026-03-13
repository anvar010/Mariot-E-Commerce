require('dotenv').config();
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PASS length:', process.env.DB_PASS ? process.env.DB_PASS.length : 0);
const db = require('./config/db');
db.query('SELECT 1').then(() => console.log('Query successful')).catch(err => console.error('Query failed:', err));

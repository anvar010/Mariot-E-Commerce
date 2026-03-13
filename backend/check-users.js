require('dotenv').config();
const db = require('./config/db');

const fs = require('fs');
async function checkUsers() {
    try {
        console.log('--- Database User Check ---');
        const [users] = await db.execute(`
            SELECT u.id, u.name, u.email, r.name as role 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id
        `);

        fs.writeFileSync('user_debug.json', JSON.stringify(users, null, 2));
        console.log('Results written to user_debug.json');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUsers();

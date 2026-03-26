require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    try {
        const email = 'admin@mariot.com';
        const newPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        console.log(`Resetting password for ${email}...`);

        const [result] = await db.execute(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, email]
        );

        if (result.affectedRows > 0) {
            console.log('✅ Admin password reset to: admin123');
        } else {
            console.log('❌ Admin user not found. Creating it...');
            const [roleRows] = await db.execute('SELECT id FROM roles WHERE name = "admin"');
            if (roleRows.length === 0) {
                console.error('❌ Role "admin" does not exist in the database!');
                process.exit(1);
            }
            const adminRoleId = roleRows[0].id;

            await db.execute(
                'INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)',
                ['Admin User', email, hashedPassword, adminRoleId]
            );
            console.log('✅ Admin user created with password: admin123');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetAdmin();

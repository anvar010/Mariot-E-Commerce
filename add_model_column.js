const db = require('./config/db');

async function main() {
    try {
        await db.execute('ALTER TABLE products ADD COLUMN model VARCHAR(255) NULL AFTER name');
        console.log('Column added successfully');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Column already exists');
        } else {
            console.error('Error:', e.message);
        }
    }
    process.exit(0);
}

main();

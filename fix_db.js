const db = require('./config/db');
const fs = require('fs');

async function fix() {
    try {
        const [columns] = await db.execute('DESCRIBE products');
        const names = columns.map(c => c.Field);
        fs.writeFileSync('columns.txt', names.join(', '));
        process.exit(0);
    } catch (err) {
        fs.writeFileSync('columns.txt', 'ERROR: ' + err.message);
        process.exit(1);
    }
}

fix();

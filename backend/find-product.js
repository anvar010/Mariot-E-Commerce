const path = require('path');
const db = require(path.join('d:', 'MARIOT', 'backend', 'config', 'db'));

async function check() {
    try {
        const [rows] = await db.execute('SELECT id, name, slug FROM products WHERE name LIKE ?', ['%blast chiller%']);
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();

// require('dotenv').config();
// const db = require('./config/db');

// async function migrate() {
//     try {
//         console.log('Checking database tables structure...');

//         // Check for columns in coupons table
//         const [columns] = await db.execute('SHOW COLUMNS FROM coupons');
//         const columnNames = columns.map(c => c.Field);
//         console.log('Existing columns in coupons:', columnNames);

//         if (!columnNames.includes('applicable_brands')) {
//             console.log('Column "applicable_brands" is missing. Adding it...');
//             await db.execute('ALTER TABLE coupons ADD COLUMN applicable_brands TEXT');
//             console.log('✅ Column "applicable_brands" added successfully!');
//         }

//         if (!columnNames.includes('applicable_products')) {
//             console.log('Column "applicable_products" is missing. Adding it...');
//             await db.execute('ALTER TABLE coupons ADD COLUMN applicable_products TEXT');
//             console.log('✅ Column "applicable_products" added successfully!');
//         }

//         console.log('Migration complete!');
//         process.exit(0);
//     } catch (error) {
//         console.error('❌ Migration Error:', error);
//         process.exit(1);
//     }
// }

// migrate();

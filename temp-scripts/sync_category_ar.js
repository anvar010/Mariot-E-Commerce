const mysql = require('mysql2/promise');
const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mariot_b2b'
};

const translations = {
    "Coffee Maker Machines": "ماكينات صنع القهوة",
    "Storage and Transport": "التخزين والنقل",
    "Fryers": "القلايات",
    "IRON": "مكواة",
    "Blenders": "الخلاطات",
    "Kitchen Equipment": "معدات المطبخ",
    "Cooking Equipment": "معدات الطبخ",
    "Refrigeration": "تبريد",
    "Dishwashing": "غسيل الأطباق",
    "Food Preparation": "تحضير الطعام",
    "Bakery Equipment": "معدات المخبوزات",
    "Tableware": "أدوات المائدة",
    "Cleaning Supplies": "لوازم التنظيف",
    "Industrial Machines": "ماكينات صناعية",
    "Appliances": "أجهزة كهربائية",
    "Computers": "أجهزة الكمبيوتر",
    "Electronics": "إلكترونيات",
    "Ovens": "أفران",
    "Microwaves": "ميكروويف",
    "Mixers": "خلاطات",
    "Toasters": "محامص",
    "Kettles": "غلايات",
    "Grills": "شوايات",
    "Hoods": "شفاطات",
    "Sinks": "أحواض",
    "Freezers": "مجمدات",
    "Ice Makers": "صناع الثلج"
};

async function syncTranslations() {
    const connection = await mysql.createConnection(config);
    try {
        const [rows] = await connection.query('SELECT id, name FROM categories');
        console.log(`Found ${rows.length} categories.`);

        for (const row of rows) {
            const arName = translations[row.name];
            if (arName) {
                console.log(`Updating ${row.name} -> ${arName}`);
                await connection.query('UPDATE categories SET name_ar = ? WHERE id = ?', [arName, row.id]);
            } else {
                console.log(`No translation for ${row.name}`);
            }
        }
        console.log('Finished updating categories.');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

syncTranslations();

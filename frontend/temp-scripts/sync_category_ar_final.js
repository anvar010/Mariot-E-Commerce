const mysql = require('mysql2/promise');
const config = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'mariot_b2b'
};

const translations = {
    "Coffee Makers": "ماكينات صنع القهوة",
    "Espresso Machines": "ماكينات إسبريسو",
    "Volumetric Espresso Machines": "ماكينات إسبريسو حجمية",
    "Gravimetric Espresso Machines": "ماكينات إسبريسو وزنية",
    "Coffee Grinders": "مطاحن القهوة",
    "Espresso Grinders": "مطاحن إسبريسو",
    "Brewed Coffee Grinders": "مطاحن القهوة المقطرة",
    "Coffee & Tea Brewers": "محضرات القهوة والشاي",
    "Pour Overs": "أدوات التقطير",
    "Water Boilers": "غلايات المياه",
    "Filters": "فلاتر",
    "Tea Makers": "صناع الشاي",
    "Ice equipment": "معدات الثلج",
    "Ice Cube": "مكعبات ثلج",
    "Ice Flakers": "قشور ثلج",
    "Ice Bin": "حاويات ثلج",
    "Cooking equipment": "معدات طبخ",
    "Commercial Griddles & Accessories": "صاجات تجارية وملحقاتها",
    "Gas Griddles": "صاجات غاز",
    "Electric Griddles": "صاجات كهربائية",
    "Restaurant Ranges": "مداخن مطاعم",
    "Gas Ranges": "مواقد غاز",
    "Electric Ranges": "مواقد كهربائية",
    "Countertop Ranges": "مواقد لسطح العمل",
    "Induction Ranges": "مواقد حث حراري",
    "Toasters and Panini Grills": "محامص وشوايات بانيني",
    "Conveyor Toasters": "محامص سير",
    "Panini Grills": "شوايات بانيني",
    "Pop-Up Toasters": "محامص منبثقة",
    "Waffle and Crepe Machines": "ماكينات وافل وكريب",
    "Waffle Irons": "ماكينات وافل",
    "Baking Plates": "صفائح خبز",
    "Crepe Makers": "صناع كريب",
    "Char broilers": "شوايات فحم",
    "Radiant Char broilers": "شوايات إشعاعية",
    "Lava Rock Char broilers": "شوايات حجر بركاني",
    "Specialty Cooking Equipment": "معدات طبخ متخصصة",
    "Electric Char broilers": "شوايات فحم كهربائية",
    "Sous Vide Machines": "أجهزة السوس فيد",
    "Pasta Cookers": "طباخات المعكرونة",
    "Salamander Grills": "شوايات سالاماندر",
    "Shawarma Machines": "ماكينات شاورما",
    "Specialty Equipment": "معدات متخصصة",
    "Steam Kettles & Braising Pans": "غلايات بخار ومقالي تحمير",
    "Commercial fryer": "قلاية تجارية",
    "Gas fryer": "قلاية غاز",
    "Electric fryer": "قلاية كهربائية",
    "Pressure fryer": "قلاية ضغط",
    "Oil Filtration and Accessories": "فلترة الزيت وملحقاتها",
    "Fry Dump Stations": "محطات تصفية القلايات",
    "Refrigeration": "تبريد",
    "Refrigerators": "ثلاجات",
    "Reach in Refrigerators": "ثلاجات رأسية",
    "Undercounter Refrigerators": "ثلاجات تحت الكاونتر",
    "Work Top Refrigerators": "ثلاجات سطح عمل",
    "Prep Table Refrigerators": "ثلاجات طاولة تحضير",
    "Chef Base Refrigerators": "ثلاجات قاعدة شيف",
    "Display Refrigerators": "ثلاجات عرض",
    "Merchandising Refrigerators": "ثلاجات تسويق",
    "Blast Chillers & Freezers": "مبردات ومجمدات صدمة",
    "Ice Cream Machines": "ماكينات آيس كريم",
    "Countertop Ice Cream Machines": "ماكينات آيس كريم لسطح العمل",
    "Floor Mount Ice Cream Machines": "ماكينات آيس كريم أرضية",
    "Freezers": "مجمدات",
    "Reach-In Freezers": "مجمدات رأسية",
    "Undercounter Freezers": "مجمدات تحت الكاونتر",
    "Work Top Freezers": "مجمدات سطح عمل",
    "Ice Cream Dipping Cabinets": "خزائن غمس الآيس كريم",
    "Merchandising Freezers": "مجمدات تسويق",
    "Beverage Equipment": "معدات مشروبات",
    "Juicers": "عصارات",
    "Slushy Machines": "ماكينات سلاش",
    "Milkshake Machines": "ماكينات ميلك شيك",
    "Hot Beverage Dispensers": "موزعات المشروبات الساخنة",
    "Chocolate Fountains": "نوافير شوكولاتة",
    "Commercial Ovens": "أفران تجارية",
    "Microwave Ovens": "أفران ميكروويف",
    "Convection Ovens": "أفران حرارية",
    "High Speed Hybrid Ovens": "أفران هجينة عالية السرعة",
    "Conveyor Ovens": "أفران سير",
    "Combi Ovens": "أفران كومبي",
    "Pizza Ovens": "أفران بيتزا",
    "Bakery Deck Ovens": "أفران مخبز",
    "Cook and Hold Ovens": "أفران طهي وحفظ",
    "Oven Accessories": "ملحقات الأفران",
    "Food Preparation": "تحضير الطعام",
    "Food Processing Equipment": "معدات معالجة الطعام",
    "Food Processing Machines": "ماكينات معالجة الطعام",
    "Food Processor Blades and Discs": "شفرات وأقراص معالج الطعام",
    "Food Packaging Appliances": "أجهزة تغليف الطعام",
    "Vacuum Sealers": "أجهزة تغليف وتفريغ الهواء",
    "Label-Printers": "طابعات الملصقات",
    "Food Blenders": "خلاطات الطعام",
    "Hand Blenders": "خلاطات يدوية",
    "Dehydrators": "أجهزة تجفيف",
    "Peelers & Dryers": "مقشرات ومجففات",
    "Commercial French Fry Cutters": "قطاعات البطاطس المقلية التجارية",
    "Manual Vegetable and Fruit Cutters": "قطاعات الخضروات والفواكه اليدوية",
    "Food Slicers": "قطاعات طعام",
    "Dough Sheeters and Dough Presses": "فردات ومكابس عجين",
    "Meat and Seafood Preparation": "تحضير اللحوم والمأكولات البحرية",
    "Meat Mincer": "فرامة لحم",
    "Bone Saw Cutters": "مناشير عظم",
    "Patty Press": "مكبس برجر",
    "Food Holding and Warming Line": "خط حفظ وتسخين الطعام",
    "Heat Lamps": "مصابيح حرارية",
    "Countertop Warmers and Display Cases": "مسخنات وخزائن عرض لسطح العمل",
    "Strip Warmers": "مسخنات طولية",
    "Holding and Proofing Cabinets": "خزائن حفظ وتخمير",
    "Storage": "تخزين",
    "Storage Shelves": "أرفف تخزين",
    "Storage Racks": "رفوف تخزين",
    "Carts, Trucks and Dollies": "عربات وشاحنات ومنصات نقل",
    "Dinnerware Storage and Transport": "تخزين ونقل أواني الطعام",
    "laundries": "مصبغة / غسيل ملابس",
    "washing machines": "غسالات",
    "dryers": "مجففات",
    "IRON": "مكواة",
    "Dishwasher": "غسالة أطباق",
    "Blenders": "خلاطات",
    "Coffee Maker Machines": "ماكينات صنع القهوة" // Handled case saw in log
};

async function syncTranslations() {
    const connection = await mysql.createConnection(config);
    try {
        const [rows] = await connection.query('SELECT id, name FROM categories');
        console.log(`Checking ${rows.length} categories.`);

        let count = 0;
        for (const row of rows) {
            const name = row.name.trim(); // Trim for robustness
            const arName = translations[name];

            if (arName) {
                await connection.query('UPDATE categories SET name_ar = ? WHERE id = ?', [arName, row.id]);
                count++;
            } else {
                console.log(`Missing translation for: "${name}"`);
            }
        }
        console.log(`Updated ${count} categories successfully.`);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

syncTranslations();

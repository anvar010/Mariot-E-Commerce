const xlsx = require('xlsx');
const path = require('path');

const filePath = 'd:\\MARIOT\\frontend\\public\\products.xls';
try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log('Headers:', JSON.stringify(data[0]));
    console.log('Sample Row:', JSON.stringify(data[1]));
} catch (err) {
    console.error('Error reading excel:', err.message);
}

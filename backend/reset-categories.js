require('dotenv').config();
const db = require('./config/db');
const slugify = require('slugify');

async function migrate() {
    try {
        console.log('Updating Categories table with new list...');

        const newCategories = [
            'Coffee Makers',
            'Ice Equipment',
            'Cooking Equipment',
            'Refrigeration',
            'Beverage Equipment',
            'Commercial Ovens',
            'Food Preparation',
            'Food Holding and Warming Line',
            'Delivery and Storage',
            'Parts',
            'Used Equipment',
            'Dishwashing',
            'Stainless Steel Equipment',
            'Janitorial & Safety Supplies',
            'Water Treatment',
            'Home Use',
            'Dining Room',
            'Smallwares',
            'Disposables',
            'Food & Beverage Ingredients'
        ];

        // 1. Delete all existing categories (Warning: this might affect products linked to them)
        // Set category_id to NULL for all products first to avoid FK errors if not CASCADE
        await db.execute('UPDATE products SET category_id = NULL');
        await db.execute('DELETE FROM categories');

        // 2. Insert new categories
        for (const catName of newCategories) {
            const slug = slugify(catName, { lower: true });
            await db.execute('INSERT INTO categories (name, slug) VALUES (?, ?)', [catName, slug]);
            console.log(`✅ Category "${catName}" added.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration Error:', error);
        process.exit(1);
    }
}

migrate();

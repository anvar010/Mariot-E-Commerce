const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '.env') });

const db = require('./config/db');

const seed = async () => {
    try {
        console.log('Seeding database...');

        // Seed Categories
        const categories = [
            { id: 1, name: 'Equipment', slug: 'equipment', description: 'Professional kitchen equipment' },
            { id: 2, name: 'Kitchen', slug: 'kitchen', description: 'Kitchen supplies and utensils' }
        ];

        for (const cat of categories) {
            try {
                // Check if exists
                const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [cat.id]);
                if (rows.length === 0) {
                    await db.query('INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)', [cat.id, cat.name, cat.slug, cat.description]);
                    console.log(`Included Category: ${cat.name}`);
                } else {
                    console.log(`Category ${cat.name} already exists.`);
                }
            } catch (err) {
                console.error(`Error inserting category ${cat.name}:`, err.message);
            }
        }

        // Seed Brands
        const brands = [
            { id: 1, name: 'RATIONAL', slug: 'rational' },
            { id: 2, name: 'HOBART', slug: 'hobart' }
        ];

        for (const brand of brands) {
            try {
                const [rows] = await db.query('SELECT * FROM brands WHERE id = ?', [brand.id]);
                if (rows.length === 0) {
                    await db.query('INSERT INTO brands (id, name, slug) VALUES (?, ?, ?)', [brand.id, brand.name, brand.slug]);
                    console.log(`Inserted Brand: ${brand.name}`);
                } else {
                    console.log(`Brand ${brand.name} already exists.`);
                }
            } catch (err) {
                console.error(`Error inserting brand ${brand.name}:`, err.message);
            }
        }

        console.log('Seeding completed successfully.');
        process.exit();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
};

seed();

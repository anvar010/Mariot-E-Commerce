require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');

async function addColumn() {
    try {
        await db.query("ALTER TABLE products ADD COLUMN youtube_video_link VARCHAR(255) NULL;");
        console.log("Column youtube_video_link added successfully.");
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("Column youtube_video_link already exists.");
        } else {
            console.error("Error adding column:", error);
        }
    } finally {
        process.exit();
    }
}

addColumn();

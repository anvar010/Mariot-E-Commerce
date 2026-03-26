const app = require('./app');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Auto-migrate: add status column to users table if missing
const db = require('./config/db');
(async () => {
    try {
        await db.query("ALTER TABLE users ADD COLUMN status ENUM('active', 'suspended') DEFAULT 'active' AFTER role_id");
        console.log('[Migration] Added status column to users table');
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('[Migration] status column already exists, skipping');
        } else {
            console.error('[Migration] Error:', err.message);
        }
    }
})();

// Verify SMTP email connection on startup
const { verifySmtpConnection } = require('./utils/sendEmail');
verifySmtpConnection();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});

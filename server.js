const dotenv = require('dotenv');
// Load env vars FIRST (override shell env so .env wins)
dotenv.config({ override: true });

const app = require('./app');

const startServer = async () => {
    try {

        // Initialize database and migrations FIRST
        const { initDb } = require('./config/init');
        await initDb();

        const PORT = process.env.PORT || 5000;
        const server = app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });

        // Verify SMTP email connection on startup
        const { verifySmtpConnection } = require('./utils/sendEmail');
        verifySmtpConnection();

        // Clear expired offer flags on startup and every hour
        const { startOfferCleanupJob } = require('./utils/offerCleanup');
        startOfferCleanupJob();

        // Start abandoned cart reminder cron (every 30 min)
        const { startAbandonedCartJob } = require('./services/abandonedCart.service');
        startAbandonedCartJob();

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            console.log(`Error: ${err.message}`);
            server.close(() => process.exit(1));
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

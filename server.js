const app = require('./app');
const dotenv = require('dotenv');

const startServer = async () => {
    try {
        // Load env vars
        dotenv.config();

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

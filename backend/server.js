const app = require('./app');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Initialize database and migrations
const { initDb } = require('./config/init');
initDb();

// Verify SMTP email connection on startup
const { verifySmtpConnection } = require('./utils/sendEmail');
verifySmtpConnection();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    // Close server & exit process
    server.close(() => process.exit(1));
});

const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });
};

/**
 * Send a password reset email to the user
 * @param {string} toEmail - Recipient email
 * @param {string} userName - User's display name
 * @param {string} resetUrl - Full reset URL with token
 */
const sendPasswordResetEmail = async (toEmail, userName, resetUrl) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: 'Reset Your Password — Mariot Store',
        text: `Hi ${userName},\n\nYou requested a password reset for your Mariot Store account.\n\nPlease click the link below to set a new password. This link will expire in 15 minutes.\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n\nBest regards,\nMariot Store Team`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Mariot Store</h1>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">Password Reset Request</p>
                </div>

                <!-- Body -->
                <div style="padding: 40px 30px; background-color: #ffffff;">
                    <p style="color: #334155; font-size: 16px; margin-top: 0;">Hi <strong>${userName}</strong>,</p>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                        We received a request to reset the password associated with your Mariot Store account. 
                        Click the button below to set a new password.
                    </p>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${resetUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #56cfe1, #4abccb); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(86, 207, 225, 0.4);">
                            Reset My Password
                        </a>
                    </div>
                    
                    <!-- Expiry notice -->
                    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                        <p style="color: #92400e; font-size: 13px; margin: 0; font-weight: 600;">
                            ⏱ This link will expire in 15 minutes
                        </p>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
                        If you didn't request a password reset, you can safely ignore this email. 
                        Your password will remain unchanged.
                    </p>
                    
                    <!-- Fallback link -->
                    <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px;">
                            If the button doesn't work, copy and paste this link into your browser:
                        </p>
                        <p style="color: #56cfe1; font-size: 12px; word-break: break-all; margin: 0;">
                            ${resetUrl}
                        </p>
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color: #0f172a; padding: 20px 30px; text-align: center;">
                    <p style="color: #64748b; margin: 0; font-size: 12px;">
                        © ${new Date().getFullYear()} Mariot Store. All rights reserved.
                    </p>
                    <p style="color: #475569; margin: 6px 0 0; font-size: 11px;">
                        Salah Al Din St, Dubai, UAE
                    </p>
                </div>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${toEmail}`);
};

module.exports = { sendPasswordResetEmail };

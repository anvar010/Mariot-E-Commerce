const nodemailer = require('nodemailer');

const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        tls: {
            rejectUnauthorized: false
        },
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        }
    });
};

// Verify SMTP connection on first use
const verifySmtpConnection = async () => {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.error('[EMAIL] ❌ SMTP_EMAIL or SMTP_PASSWORD env vars are missing!');
        return false;
    }
    console.log(`[EMAIL] SMTP_EMAIL: ${process.env.SMTP_EMAIL}`);
    console.log(`[EMAIL] SMTP_PASSWORD length: ${process.env.SMTP_PASSWORD?.length} chars`);
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('[EMAIL] ✅ SMTP connection verified successfully');
        return true;
    } catch (error) {
        console.error('[EMAIL] ❌ SMTP connection failed:', error.message);
        return false;
    }
};

/**
 * Sends a generic HTML email.
 * @param {string} to - Recipient email.
 * @param {string} subject - Email subject.
 * @param {string} html - HTML content of the email.
 */
const sendEmail = async (to, subject, html) => {
    try {
        const transporter = createTransporter();
        const mailOptions = {
            from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[EMAIL] ✅ Generic email sent: ' + info.response);
        return info;
    } catch (error) {
        console.error('[EMAIL] ❌ Error sending generic email:', error);
        throw error;
    }
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

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ Password reset email sent to ${toEmail}`);
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send password reset email to ${toEmail}:`, error.message);
        throw error;
    }
};

/**
 * Send an order confirmation email to the user (sent immediately after checkout)
 */
const sendOrderConfirmationEmail = async (toEmail, userName, orderId, finalAmount, orderItems = [], orderData = {}) => {
    const transporter = createTransporter();

    const subtotal = Number(orderData.total_amount || 0).toFixed(2);
    const vat = Number(orderData.vat_amount || 0).toFixed(2);
    const discount = Number(orderData.discount_amount || 0).toFixed(2);
    const total = Number(finalAmount || 0).toFixed(2);
    const date = new Date(orderData.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const billing = orderData.billing_details || {};
    const shipping = orderData.shipping_address || billing;
    const isPaid = (orderData.payment_status === 'paid' || orderData.payment_status === 'PAID');
    const isAdmin = orderData.is_admin_copy === true;

    const paymentDisplay = {
        'bank_transfer': 'Direct bank transfer',
        'cod': 'Cash on Delivery',
        'tabby': 'Tabby (Installments)',
        'card': 'Credit/Debit Card'
    }[orderData.payment_method] || orderData.payment_method || 'N/A';

    const itemRows = orderItems.map(item => `
        <div style="padding:15px;border-bottom:1px solid #f1f5f9;">
             <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td width="60" style="vertical-align:middle;">
                        <img src="${item.image || 'https://mariotstore.com/assets/mariot-logo.webp'}" width="50" height="50" style="border-radius:4px;object-fit:contain;">
                    </td>
                    <td style="padding-left:15px;vertical-align:middle;">
                        <p style="margin:0;font-size:13px;color:#475569;line-height:1.4;">${item.name}</p>
                    </td>
                    <td width="40" align="center" style="vertical-align:middle;">
                        <span style="display:inline-block;padding:2px 6px;background-color:#f1f5f9;color:#64748b;font-size:11px;font-weight:700;border-radius:4px;">x${item.quantity}</span>
                    </td>
                    <td align="right" style="vertical-align:middle;width:80px;">
                        <p style="margin:0;font-size:13px;font-weight:700;color:#0f172a;">AED ${Number((item.price_at_purchase || item.price || 0) * item.quantity).toFixed(2)}</p>
                    </td>
                </tr>
             </table>
        </div>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @media only screen and (max-width: 600px) {
                .container { width: 100% !important; padding: 20px 10px !important; }
                .footer-col { width: 100% !important; padding: 10px 0 !important; display: block !important; }
            }
        </style>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f7f9;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f9;padding:40px 0;">
            <tr>
                <td align="center">
                    <!-- Top Card -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;margin-bottom:25px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                            <td align="center" style="padding:30px 0;border-bottom:1px solid #f1f5f9;">
                                <img src="https://mariotstore.com/assets/mariot-logo.webp" alt="Mariot" style="height:45px;">
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:40px 45px;">
                                <h1 style="margin:0 0 25px;font-size:20px;font-weight:600;color:#334155;">Thank you for your order!</h1>
                                <p style="margin:0 0 20px;font-size:14px;color:#475569;">Dear ${userName},</p>
                                <p style="margin:0 0 15px;font-size:14px;color:#475569;line-height:1.6;">
                                    Thank you for placing your order <strong>#${orderId}</strong> with us at Mariot!
                                </p>
                                <p style="margin:0 0 15px;font-size:14px;color:#475569;line-height:1.6;">
                                    We have received your order and we will send you a delivery confirmation as soon as it has been dispatched.
                                </p>
                                <p style="margin:0 0 25px;font-size:14px;color:#475569;line-height:1.6;">
                                    You can <a href="#" style="color:#16A1DB;text-decoration:underline;">Download the Tax Invoice here.</a>
                                </p>
                                <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
                                    Kind regards,<br>
                                    <strong>Your Mariot Team</strong>
                                </p>
                            </td>
                        </tr>
                    </table>

                    <!-- Order Detail Card -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                            <td style="padding:40px 45px;">
                                <h2 style="margin:0 0 35px;font-size:18px;font-weight:600;color:#64748b;text-align:center;">Order Detail</h2>
                                
                                <!-- Meta Row -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-top:1px solid #e2e8f0;padding:15px 0;">
                                    <tr>
                                        <td><span style="font-size:11px;color:#94a3b8;text-transform:uppercase;">Order #</span><br><span style="font-size:13px;color:#334155;font-weight:600;">${orderId}</span></td>
                                        <td align="center"><span style="font-size:11px;color:#94a3b8;text-transform:uppercase;">Date</span><br><span style="font-size:13px;color:#334155;font-weight:600;">${date}</span></td>
                                        <td align="right"><span style="font-size:11px;color:#94a3b8;text-transform:uppercase;">Total</span><br><span style="font-size:13px;color:#334155;font-weight:600;">AED ${total}</span></td>
                                    </tr>
                                </table>

                                <!-- Products -->
                                <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:30px;">
                                    <div style="padding:10px 15px;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">
                                        by: <span style="color:#334155;font-weight:600;">Mariot Delivery (Standard)</span>
                                    </div>
                                    ${itemRows}
                                </div>

                                <!-- Summary Table -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:35px;border-bottom:1px solid #e2e8f0;padding-bottom:15px;">
                                    <tr><td colspan="2" style="padding-bottom:15px;font-size:14px;font-weight:700;color:#334155;">Summary</td></tr>
                                    <tr><td style="padding:5px 0;font-size:13px;color:#64748b;">Items</td><td align="right" style="padding:5px 0;font-size:13px;color:#334155;">AED ${subtotal}</td></tr>
                                    <tr><td style="padding:5px 0;font-size:13px;color:#64748b;">Shipping fees</td><td align="right" style="padding:5px 0;font-size:13px;color:#334155;">AED 0.00</td></tr>
                                    ${Number(discount) > 0 ? `<tr><td style="padding:5px 0;font-size:13px;color:#64748b;">Discount</td><td align="right" style="padding:5px 0;font-size:13px;color:#ef4444;">-AED ${discount}</td></tr>` : ''}
                                    <tr><td style="padding:5px 0;font-size:13px;color:#64748b;">Total VAT amount</td><td align="right" style="padding:5px 0;font-size:13px;color:#334155;">AED ${vat}</td></tr>
                                    <tr style="font-weight:700;"><td style="padding:15px 0 5px;font-size:15px;color:#0f172a;">Total <span style="font-size:11px;font-weight:400;color:#64748b;">VAT included</span></td><td align="right" style="padding:15px 0 5px;font-size:18px;color:#0f172a;">AED ${total}</td></tr>
                                </table>

                                <!-- Addresses -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                                    <tr>
                                        <td width="50%" style="vertical-align:top;padding-right:20px;">
                                            <h4 style="margin:0 0 12px;font-size:15px;color:#64748b;font-weight:600;">Delivery Address</h4>
                                            <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                                                ${shipping.firstName || userName} ${shipping.lastName || ''}<br>
                                                ${shipping.streetAddress || ''}<br>
                                                ${shipping.city || ''}<br>
                                                ${shipping.phone || ''}
                                            </p>
                                        </td>
                                        <td width="50%" style="vertical-align:top;">
                                            <h4 style="margin:0 0 12px;font-size:15px;color:#64748b;font-weight:600;">Billing Address</h4>
                                            <p style="margin:0 0 15px;font-size:13px;color:#475569;line-height:1.6;">
                                                ${billing.firstName || userName} ${billing.lastName || ''}<br>
                                                ${billing.streetAddress || ''}<br>
                                                ${billing.city || ''}
                                            </p>
                                            <h4 style="margin:0 0 8px;font-size:15px;color:#64748b;font-weight:600;">Payment</h4>
                                            <p style="margin:0;font-size:13px;color:#475569;">${paymentDisplay}</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <!-- Footer -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="padding:40px 0;">
                        <tr>
                            <td width="50%" class="footer-col" style="vertical-align:top;padding-right:15px;">
                                <table cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="vertical-align:top;"><img src="https://cdn-icons-png.flaticon.com/32/471/471664.png" width="22" height="22"></td>
                                        <td style="padding-left:12px;">
                                            <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#475569;">Any questions?</p>
                                            <p style="margin:0;font-size:11px;color:#64748b;line-height:1.5;">
                                                Visit our Help Center to <a href="#" style="color:#16A1DB;text-decoration:none;">contact Customer Service</a>.<br>
                                                Available daily from 9:00 AM to 6:00 PM.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                            <td width="50%" class="footer-col" style="vertical-align:top;padding-left:15px;">
                                <table cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="vertical-align:top;"><img src="https://cdn-icons-png.flaticon.com/32/12034/12034988.png" width="22" height="22"></td>
                                        <td style="padding-left:12px;">
                                            <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#475569;">Follow us!</p>
                                            <p style="margin:0 0 10px;font-size:11px;color:#64748b;">We share great offers and tips daily::</p>
                                            <table cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="padding-right:10px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" width="18" height="18"></td>
                                                    <td style="padding-right:10px;"><img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" width="18" height="18"></td>
                                                    <td style="padding-right:10px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733579.png" width="18" height="18"></td>
                                                    <td><img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" width="18" height="18"></td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({ from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`, to: toEmail, subject: isAdmin ? `🔔 NEW ORDER RECEIVED — #${orderId}` : (isPaid ? `✅ Payment Confirmed — Order #${orderId} — Mariot Store` : `🛒 Order Confirmation #${orderId} — Mariot Store`), html });
        console.log(`[EMAIL] ✅ Order confirmation email sent to ${toEmail}`);
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send order confirmation email to ${toEmail}:`, error.message);
    }
};


/**
 * Send a welcome email to the new user
 */
const sendWelcomeEmail = async (toEmail, userName) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: `Welcome to Mariot Store, ${userName.split(' ')[0]}! 🥳`,
        text: `Hi ${userName},\n\nWelcome to Mariot Store! We're thrilled to have you with us.\n\nBest regards,\nMariot Store Team`,
        html: `
            <div style="background-color: #f4f4f4; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; color: #000000; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    
                    <!-- Logo -->
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="https://mariotstore.com/wp-content/uploads/2024/10/kitchen-equipment-store.png" alt="MARIOT" style="width: 220px; height: auto;">
                        <h2 style="font-size: 24px; color: #000000; margin: 20px 0 5px; font-weight: 700;">Welcome to <span style="background-color: #fff9c4; padding: 0 4px;">Mariot</span>!</h2>
                    </div>

                    <p style="font-size: 16px; color: #000000; font-weight: 600;">Hi ${userName},</p>
                    
                    <p style="font-size: 15px; color: #000000; line-height: 1.6;">
                        We're absolutely thrilled to have you join the <strong>Mariot Store</strong> family! You've just unlocked a world of premium kitchen equipment and exclusive member rewards.
                    </p>

                    <div style="background-color: #fafafa; border-radius: 8px; padding: 25px; margin: 30px 0; border: 1px solid #eeeeee;">
                        <h3 style="margin-top: 0; color: #000000; font-size: 16px;">What's next?</h3>
                        <ul style="padding-left: 20px; color: #1e293b; font-size: 14px; line-height: 1.6;">
                            <li style="margin-bottom: 10px;"><strong>Shop Premium</strong>: Explore our latest collection of professional kitchen gear.</li>
                            <li style="margin-bottom: 10px;"><strong>Earn Rewards</strong>: You've already earned <strong>1,000 welcome points</strong>! Use them on your first order.</li>
                            <li><strong>Fast Checkout</strong>: Save your addresses for a lightning-fast shopping experience.</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://mariotkitchen.com" style="background-color: #0ea5e9; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Start Shopping Now</a>
                    </div>

                    <div style="margin-top: 40px; text-align: center; border-top: 2px solid #000000; padding-top: 25px; color: #000000; font-size: 15px; line-height: 1.6;">
                        <p>If you have any questions, our support team is always here for you at <a href="mailto:admin@mariotkitchen.com" style="color: #0ea5e9; text-decoration: underline;">admin@mariotkitchen.com</a>.</p>
                    </div>

                    <div style="margin-top: 30px; text-align: center; color: #1e293b; font-size: 12px; font-weight: bold;">
                        — Mariot Store —
                    </div>
                </div> <!-- Close inner white container -->
            </div> <!-- Close outer gray background -->
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ Welcome email sent to ${toEmail}`);
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send welcome email to ${toEmail}:`, error.message);
    }
};

/**
 * Send a quotation email to the customer
 */
const sendQuotationEmail = async (toEmail, userName, quotationRef, finalAmount, items = []) => {
    const transporter = createTransporter();

    // Map items to rows
    const itemRows = items.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${Number(item.price).toFixed(2)} AED</td>
        </tr>
    `).join('');

    const mailOptions = {
        from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: `Your Quotation from Mariot Store — ${quotationRef}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://mariotstore.com/wp-content/uploads/2024/10/kitchen-equipment-store.png" alt="MARIOT" style="width: 180px;">
                </div>
                <h2 style="color: #333; text-align: center;">Quotation #${quotationRef}</h2>
                <p>Dear <strong>${userName}</strong>,</p>
                <p>Thank you for choosing Mariot Kitchen Equipment. Below is the quotation you requested for your commercial kitchen equipment.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
                    <thead>
                        <tr style="background: #f8f8f8;">
                            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="padding: 15px 10px; text-align: right; font-weight: bold;">Final Total:</td>
                            <td style="padding: 15px 10px; text-align: right; font-weight: bold; color: #e11d48; font-size: 18px;">${Number(finalAmount).toFixed(2)} AED</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #e11d48; margin-bottom: 20px;">
                    <p style="margin: 0; color: #991b1b; font-size: 14px;">
                        <strong>Note:</strong> This quotation is valid for 15 days from the date of issue. Prices are inclusive of VAT where applicable.
                    </p>
                </div>

                <p style="font-size: 14px; color: #666; line-height: 1.6;">
                    If you have any questions or would like to proceed with this quotation, please reply to this email or call us at <a href="tel:+971500000000" style="color: #0ea5e9;">+971 50 000 0000</a>.
                </p>

                <div style="text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; color: #999; font-size: 12px;">
                    <p>© Mariot Store — Professional Kitchen Solutions</p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ Quotation email sent to ${toEmail}`);
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send quotation email to ${toEmail}:`, error.message);
        throw error;
    }
};

/**
 * Send an order status update email to the user (e.g. Shipped, Delivered)
 */
const sendOrderStatusUpdateEmail = async (toEmail, userName, orderId, status, orderData = {}) => {
    const transporter = createTransporter();

    const orderItems = orderData.items || [];
    const total = Number(orderData.final_amount || 0).toFixed(2);
    const date = new Date(orderData.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const billing = orderData.billing_details || {};
    const shipping = orderData.shipping_address || billing;

    const statusMessages = {
        'processing': 'is being processed',
        'shipped': 'is on its way',
        'delivered': 'has been delivered',
        'cancelled': 'has been cancelled',
        'pending': 'is pending'
    };

    const statusTitle = status.charAt(0).toUpperCase() + status.slice(1);
    const friendlyStatus = statusMessages[status.toLowerCase()] || `is now ${status}`;

    // Generate product highlight rows for the Shipment Box
    const itemRows = orderItems.map(item => `
        <div style="padding:15px;display:flex;align-items:center;">
             <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td width="70" style="vertical-align:middle;">
                        <img src="${item.image || 'https://mariotstore.com/assets/mariot-logo.webp'}" width="50" height="50" style="border-radius:4px;object-fit:contain;">
                    </td>
                    <td style="padding-left:15px;vertical-align:middle;">
                        <p style="margin:0;font-size:13px;color:#475569;line-height:1.4;">${item.name}</p>
                    </td>
                    <td align="right" style="vertical-align:middle;width:40px;">
                        <span style="display:inline-block;padding:4px 8px;background-color:#f1f5f9;color:#64748b;font-size:12px;font-weight:700;border-radius:4px;">x${item.quantity}</span>
                    </td>
                </tr>
             </table>
        </div>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @media only screen and (max-width: 600px) {
                .container { width: 100% !important; padding: 20px 10px !important; }
                .footer-col { width: 100% !important; padding: 10px 0 !important; display: block !important; }
            }
        </style>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f7f9;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f9;padding:40px 0;">
            <tr>
                <td align="center">
                    <!-- Top Card -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;margin-bottom:25px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                            <td align="center" style="padding:30px 0;border-bottom:1px solid #f1f5f9;">
                                <img src="https://mariotstore.com/assets/mariot-logo.webp" alt="Mariot" style="height:45px;">
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:40px 45px;">
                                <h1 style="margin:0 0 25px;font-size:20px;font-weight:600;color:#334155;">Your order has been ${status}!</h1>
                                <p style="margin:0 0 20px;font-size:14px;color:#475569;">Dear ${userName},</p>
                                <p style="margin:0 0 15px;font-size:14px;color:#475569;line-height:1.6;">
                                    We're happy to let you know that your order <strong>${orderId}</strong> ${friendlyStatus}!
                                </p>
                                <p style="margin:0 0 25px;font-size:14px;color:#475569;line-height:1.6;">
                                    Please find your order details for shipment below.
                                </p>
                                <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
                                    Thank you for shopping with us,<br>
                                    <strong>Mariot Team</strong>
                                </p>
                            </td>
                        </tr>
                    </table>

                    <!-- Order Detail Card -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                            <td style="padding:40px 45px;">
                                <h2 style="margin:0 0 35px;font-size:18px;font-weight:600;color:#64748b;text-align:center;">Order Detail</h2>
                                
                                <!-- Meta Row -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:35px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:15px 0;">
                                    <tr>
                                        <td><span style="font-size:11px;color:#94a3b8;text-transform:uppercase;">Order #</span><br><span style="font-size:13px;color:#334155;font-weight:600;">${orderId}</span></td>
                                        <td align="center"><span style="font-size:11px;color:#94a3b8;text-transform:uppercase;">Date</span><br><span style="font-size:13px;color:#334155;font-weight:600;">${date}</span></td>
                                        <td align="right"><span style="font-size:11px;color:#94a3b8;text-transform:uppercase;">Total</span><br><span style="font-size:13px;color:#334155;font-weight:600;">AED ${total}</span></td>
                                    </tr>
                                </table>

                                <!-- Addresses -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:35px;">
                                    <tr>
                                        <td width="50%" style="vertical-align:top;padding-right:20px;">
                                            <h4 style="margin:0 0 12px;font-size:15px;color:#64748b;font-weight:600;">Delivery Address</h4>
                                            <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                                                ${shipping.firstName || userName} ${shipping.lastName || ''}<br>
                                                ${shipping.streetAddress || ''}<br>
                                                ${shipping.city || ''}<br>
                                                ${shipping.phone || ''}
                                            </p>
                                        </td>
                                        <td width="50%" style="vertical-align:top;">
                                            <h4 style="margin:0 0 12px;font-size:15px;color:#64748b;font-weight:600;">Billing Address</h4>
                                            <p style="margin:0 0 15px;font-size:13px;color:#475569;line-height:1.6;">
                                                ${billing.firstName || userName} ${billing.lastName || ''}<br>
                                                ${billing.streetAddress || ''}<br>
                                                ${billing.city || ''}
                                            </p>
                                            <h4 style="margin:0 0 8px;font-size:15px;color:#64748b;font-weight:600;">Payment</h4>
                                            <p style="margin:0;font-size:13px;color:#475569;">
                                                ${orderData.payment_method === 'cod' ? 'Cash on Delivery' : orderData.payment_method === 'tabby' ? 'Tabby (Installments)' : 'Credit Card'}
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Shipment Box -->
                                <div style="border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;">
                                    <div style="padding:15px 20px;border-bottom:1px solid #f1f5f9;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td>
                                                    <span style="font-size:14px;font-weight:600;color:#334155;">Shipment No. 1</span>
                                                    <span style="margin-left:10px;padding:2px 10px;background-color:#fef3c7;color:#92400e;font-size:11px;font-weight:700;border-radius:12px;text-transform:uppercase;vertical-align:middle;">${statusTitle}</span>
                                                </td>
                                                <td align="right">
                                                    <span style="font-size:12px;color:#16A1DB;font-weight:600;">Tracking ID: ${orderId}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div style="padding:10px 20px;background-color:#f8fafc;border-bottom:1px solid #f1f5f9;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="font-size:12px;color:#64748b;">by: <span style="color:#334155;font-weight:600;">Mariot Delivery (Standard)</span></td>
                                                <td align="right" style="font-size:12px;color:#64748b;">
                                                    Estimated delivery date: <span style="color:#334155;font-weight:700;">Delivery ${new Date().toLocaleDateString()}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    ${itemRows}
                                </div>
                            </td>
                        </tr>
                    </table>

                    <!-- Footer -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="padding:40px 0;">
                        <tr>
                            <td width="50%" class="footer-col" style="vertical-align:top;padding-right:15px;">
                                <table cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="vertical-align:top;"><img src="https://cdn-icons-png.flaticon.com/32/471/471664.png" width="22" height="22"></td>
                                        <td style="padding-left:12px;">
                                            <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#475569;">Any questions?</p>
                                            <p style="margin:0;font-size:11px;color:#64748b;line-height:1.5;">
                                                Visit our Help Center to <a href="#" style="color:#16A1DB;text-decoration:none;">contact Customer Service</a>.<br>
                                                Available daily from 9:00 AM to 6:00 PM.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                            <td width="50%" class="footer-col" style="vertical-align:top;padding-left:15px;">
                                <table cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="vertical-align:top;"><img src="https://cdn-icons-png.flaticon.com/32/12034/12034988.png" width="22" height="22"></td>
                                        <td style="padding-left:12px;">
                                            <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#475569;">Follow us!</p>
                                            <p style="margin:0 0 10px;font-size:11px;color:#64748b;">We share great offers and tips daily::</p>
                                            <table cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="padding-right:12px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" width="20" height="20" alt="Facebook"></td>
                                                    <td style="padding-right:12px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733579.png" width="20" height="20" alt="Twitter"></td>
                                                    <td style="padding-right:12px;"><img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" width="20" height="20" alt="Instagram"></td>
                                                    <td style="padding-right:12px;"><img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" width="20" height="20" alt="YouTube"></td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: orderData.subject || `Your order #${orderId} ${friendlyStatus} — Mariot Store`,
        html
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ Order status update email sent to ${toEmail}`);
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send status update email to ${toEmail}:`, error.message);
    }
};

/**
 * Send an abandoned cart reminder email
 * @param {string} toEmail 
 * @param {string} userName 
 * @param {Array} cartItems - [{name, quantity, price, offer_price, image, slug}]
 * @param {number} reminderNumber - 1 = first reminder, 2 = second reminder
 */
const sendAbandonedCartEmail = async (toEmail, userName, cartItems = [], reminderNumber = 1) => {
    const transporter = createTransporter();
    const SITE = process.env.FRONTEND_URL || 'https://mariotstore.com';

    const headline = reminderNumber === 1
        ? "Don't forget your items!"
        : "We hope you're still interested in\nthe items you left behind.";

    const subtotal = cartItems.reduce((sum, item) => {
        const p = Number(item.offer_price || item.price || 0);
        return sum + (p * item.quantity);
    }, 0);
    const vat = subtotal * 0.05;
    const total = subtotal + vat;

    const itemRows = cartItems.map(item => {
        const effectivePrice = Number(item.offer_price || item.price || 0);
        const originalPrice = Number(item.price || 0);
        const hasDiscount = item.offer_price && item.offer_price < item.price;
        return `
        <div style="padding:20px 15px;border-bottom:1px solid #f1f5f9;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td width="80" style="vertical-align:top;">
                        <a href="${SITE}/product/${item.slug || ''}" style="text-decoration:none;">
                            <img src="${item.image || 'https://mariotstore.com/assets/mariot-logo.webp'}" width="70" height="70" style="border-radius:6px;object-fit:contain;border:1px solid #f1f5f9;">
                        </a>
                    </td>
                    <td style="padding-left:15px;vertical-align:top;">
                        <a href="${SITE}/product/${item.slug || ''}" style="text-decoration:none;font-size:14px;font-weight:600;color:#334155;line-height:1.4;display:block;margin-bottom:8px;">${item.name}</a>
                        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">Estimated delivery by: ${new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <p style="margin:6px 0 0;">
                            <span style="display:inline-block;padding:2px 8px;background-color:#f1f5f9;color:#64748b;font-size:11px;font-weight:700;border-radius:4px;">x${item.quantity}</span>
                            <span style="margin-left:10px;font-size:14px;font-weight:700;color:#16A1DB;">AED ${(effectivePrice * item.quantity).toFixed(2)}</span>
                            ${hasDiscount ? `<span style="margin-left:6px;font-size:12px;color:#94a3b8;text-decoration:line-through;">AED ${(originalPrice * item.quantity).toFixed(2)}</span>` : ''}
                        </p>
                    </td>
                </tr>
            </table>
        </div>`;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @media only screen and (max-width: 600px) {
                .container { width: 100% !important; padding: 20px 10px !important; }
                .footer-col { width: 100% !important; padding: 10px 0 !important; display: block !important; }
            }
        </style>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f7f9;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f9;padding:40px 0;">
            <tr>
                <td align="center">
                    <!-- Top Card -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;margin-bottom:25px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                            <td align="center" style="padding:30px 0;border-bottom:1px solid #f1f5f9;">
                                <img src="https://mariotstore.com/assets/mariot-logo.webp" alt="Mariot" style="height:45px;">
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:40px 45px;text-align:center;">
                                <h1 style="margin:0 0 30px;font-size:22px;font-weight:600;color:#334155;white-space:pre-line;line-height:1.4;">${headline}</h1>
                                <a href="${SITE}/cart" style="display:inline-block;padding:16px 50px;background-color:#f59e0b;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:0.3px;">Complete your order now</a>
                            </td>
                        </tr>
                    </table>

                    <!-- Products Card -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                            <td style="padding:25px 45px 10px;text-align:center;border-bottom:1px solid #e2e8f0;">
                                <p style="margin:0;font-size:13px;color:#f59e0b;font-weight:600;">You are one click away from the best offer</p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:0 30px;">
                                ${itemRows}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:25px 45px;">
                                <!-- Summary -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;padding-top:15px;">
                                    <tr><td colspan="2" style="padding-bottom:12px;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;">Summary</td></tr>
                                    <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">Items</td><td align="right" style="padding:4px 0;font-size:13px;color:#334155;">AED ${subtotal.toFixed(2)}</td></tr>
                                    <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">Shipping fees</td><td align="right" style="padding:4px 0;font-size:13px;color:#16a34a;font-weight:600;">Free</td></tr>
                                    <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">Total taxable amount</td><td align="right" style="padding:4px 0;font-size:13px;color:#334155;">AED ${subtotal.toFixed(2)}</td></tr>
                                    <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">Total VAT amount</td><td align="right" style="padding:4px 0;font-size:13px;color:#334155;">AED ${vat.toFixed(2)}</td></tr>
                                    <tr><td style="padding:15px 0 5px;font-size:15px;font-weight:700;color:#0f172a;">Total <span style="font-size:11px;font-weight:400;color:#64748b;">(VAT included)</span></td><td align="right" style="padding:15px 0 5px;font-size:18px;font-weight:700;color:#0f172a;">AED ${total.toFixed(2)}</td></tr>
                                </table>

                                <div style="text-align:center;margin:30px 0 10px;">
                                    <p style="margin:0 0 15px;font-size:14px;color:#475569;">Checkout Now and enjoy saving with <strong>Mariot</strong></p>
                                    <a href="${SITE}/cart" style="display:inline-block;padding:16px 50px;background-color:#f59e0b;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:0.3px;width:80%;box-sizing:border-box;text-align:center;">Complete your order now</a>
                                </div>
                            </td>
                        </tr>
                    </table>

                    <!-- Footer -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="padding:40px 0;">
                        <tr>
                            <td width="50%" class="footer-col" style="vertical-align:top;padding-right:15px;">
                                <table cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="vertical-align:top;"><img src="https://cdn-icons-png.flaticon.com/32/471/471664.png" width="22" height="22"></td>
                                        <td style="padding-left:12px;">
                                            <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#475569;">Any questions?</p>
                                            <p style="margin:0;font-size:11px;color:#64748b;line-height:1.5;">
                                                Visit our Help Center to <a href="#" style="color:#16A1DB;text-decoration:none;">contact Customer Service</a>.<br>
                                                Available daily from 9:00 AM to 6:00 PM.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                            <td width="50%" class="footer-col" style="vertical-align:top;padding-left:15px;">
                                <table cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="vertical-align:top;"><img src="https://cdn-icons-png.flaticon.com/32/12034/12034988.png" width="22" height="22"></td>
                                        <td style="padding-left:12px;">
                                            <p style="margin:0 0 5px;font-size:13px;font-weight:700;color:#475569;">Follow us!</p>
                                            <p style="margin:0 0 10px;font-size:11px;color:#64748b;">We share great offers and tips daily::</p>
                                            <table cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="padding-right:12px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" width="20" height="20"></td>
                                                    <td style="padding-right:12px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733579.png" width="20" height="20"></td>
                                                    <td style="padding-right:12px;"><img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" width="20" height="20"></td>
                                                    <td><img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" width="20" height="20"></td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    const subject = reminderNumber === 1
        ? `🛒 Don't forget your items! — Mariot Store`
        : `🛒 Still interested? Complete your order — Mariot Store`;

    try {
        await transporter.sendMail({ from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`, to: toEmail, subject, html });
        console.log(`[EMAIL] ✅ Abandoned cart reminder #${reminderNumber} sent to ${toEmail}`);
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send abandoned cart email to ${toEmail}:`, error.message);
    }
};

/**
 * Send an offer notification email to a user about a product on special offer
 * @param {string} toEmail
 * @param {string} userName
 * @param {{ name: string, slug: string, price: number, offer_price: number|null, primaryImage: string|null }} product
 * @param {string} offerLabel - e.g. "Limited Offer", "Daily Offer"
 */
const sendOfferNotificationEmail = async (toEmail, userName, product, offerLabel) => {
    const transporter = createTransporter();
    const SITE = process.env.FRONTEND_URL || 'https://mariotstore.com';
    const productUrl = `${SITE}/en/product/${product.slug}`;
    const imageUrl = product.primaryImage || 'https://mariotstore.com/assets/mariot-logo.webp';
    const hasDiscount = product.offer_price && Number(product.offer_price) < Number(product.price);
    const displayPrice = hasDiscount ? Number(product.offer_price).toFixed(2) : Number(product.price).toFixed(2);
    const originalPrice = Number(product.price).toFixed(2);

    const badgeColors = {
        'Limited Offer': { bg: '#ef4444', text: '🔥 LIMITED OFFER — Hurry Up!' },
        'Daily Offer':   { bg: '#f59e0b', text: '⚡ DAILY OFFER — Today Only!' },
        'Weekly Deal':   { bg: '#8b5cf6', text: '🏷️ WEEKLY DEAL — Don\'t Miss It!' },
        'Featured':      { bg: '#0ea5e9', text: '⭐ FEATURED PRODUCT' },
        'Best Seller':   { bg: '#10b981', text: '🏆 BEST SELLER' },
    };
    const badge = badgeColors[offerLabel] || { bg: '#ef4444', text: `🔥 ${offerLabel.toUpperCase()}` };

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @media only screen and (max-width: 600px) {
                .container { width: 100% !important; padding: 20px 10px !important; }
            }
        </style>
    </head>
    <body style="margin:0;padding:0;background-color:#f4f7f9;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f9;padding:40px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

                        <!-- Logo Header -->
                        <tr>
                            <td align="center" style="padding:28px 0 20px;border-bottom:1px solid #f1f5f9;">
                                <img src="https://mariotstore.com/assets/mariot-logo.webp" alt="Mariot" style="height:40px;">
                            </td>
                        </tr>

                        <!-- Offer Badge Banner -->
                        <tr>
                            <td align="center" style="background-color:${badge.bg};padding:14px 20px;">
                                <span style="color:#ffffff;font-size:17px;font-weight:800;letter-spacing:0.5px;">${badge.text}</span>
                            </td>
                        </tr>

                        <!-- Product Image (clickable) -->
                        <tr>
                            <td align="center" style="padding:32px 40px 16px;">
                                <a href="${productUrl}" style="display:inline-block;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
                                    <img src="${imageUrl}" alt="${product.name}" width="320" style="display:block;max-width:320px;height:auto;object-fit:contain;">
                                </a>
                            </td>
                        </tr>

                        <!-- Product Name -->
                        <tr>
                            <td align="center" style="padding:0 40px 10px;">
                                <a href="${productUrl}" style="text-decoration:none;">
                                    <h2 style="margin:0;font-size:18px;font-weight:700;color:#0f172a;line-height:1.4;text-align:center;">${product.name}</h2>
                                </a>
                            </td>
                        </tr>

                        <!-- Price -->
                        <tr>
                            <td align="center" style="padding:0 40px 24px;">
                                ${hasDiscount ? `
                                <p style="margin:0;">
                                    <span style="font-size:26px;font-weight:800;color:${badge.bg};">AED ${displayPrice}</span>
                                    <span style="margin-left:10px;font-size:16px;color:#94a3b8;text-decoration:line-through;">AED ${originalPrice}</span>
                                </p>` : `
                                <p style="margin:0;">
                                    <span style="font-size:26px;font-weight:800;color:#0f172a;">AED ${displayPrice}</span>
                                </p>`}
                            </td>
                        </tr>

                        <!-- Urgency message -->
                        <tr>
                            <td align="center" style="padding:0 40px 28px;">
                                <div style="background-color:#fef3c7;border-radius:8px;padding:12px 20px;display:inline-block;border-left:4px solid ${badge.bg};">
                                    <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">⏰ This offer is available for a limited time only. Act fast before it's gone!</p>
                                </div>
                            </td>
                        </tr>

                        <!-- CTA Button -->
                        <tr>
                            <td align="center" style="padding:0 40px 40px;">
                                <a href="${productUrl}" style="display:inline-block;background-color:${badge.bg};color:#ffffff;text-decoration:none;padding:16px 50px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.3px;">
                                    Shop Now →
                                </a>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color:#0f172a;padding:20px 30px;text-align:center;">
                                <p style="color:#64748b;margin:0 0 4px;font-size:12px;">© ${new Date().getFullYear()} Mariot Store. All rights reserved.</p>
                                <p style="color:#475569;margin:0;font-size:11px;">Salah Al Din St, Dubai, UAE</p>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
            from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`,
            to: toEmail,
            subject: `${badge.text} — ${product.name} | Mariot Store`,
            html
        });
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send offer notification to ${toEmail}:`, error.message);
        throw error;
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendOrderConfirmationEmail,
    sendOrderStatusUpdateEmail,
    sendAbandonedCartEmail,
    sendWelcomeEmail,
    verifySmtpConnection,
    sendQuotationEmail,
    sendEmail,
    sendOfferNotificationEmail
};



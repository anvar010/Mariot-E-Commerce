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
 * Send an order confirmation email to the user
 */
const sendOrderConfirmationEmail = async (toEmail, userName, orderId, finalAmount, orderItems = [], orderData = {}) => {
    const transporter = createTransporter();

    const subtotal = Number(orderData.total_amount || 0).toFixed(2);
    const vat = Number(orderData.vat_amount || 0).toFixed(2);
    const total = Number(finalAmount || 0).toFixed(2);
    const paymentMethod = orderData.payment_method || 'N/A';
    const billing = orderData.billing_details || {};

    const isPaid = (orderData.payment_status === 'paid' || orderData.payment_status === 'PAID');

    // Map payment method display names
    const paymentDisplay = {
        'bank_transfer': 'Direct bank transfer',
        'bank': 'Direct bank transfer',
        'cod': 'Cash on delivery',
        'tabby': 'Tabby (Installments)',
        'card': 'Credit/Debit Card'
    }[paymentMethod] || paymentMethod;

    // Generate product table rows
    const itemRows = orderItems.map(item => `
        <tr>
            <td style="padding: 15px 0; border-bottom: 1px solid #eeeeee; width: 60px;">
                <img src="${item.image || 'https://mariotkitchen.com/assets/images/placeholder.png'}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: contain; border: 1px solid #f0f0f0; border-radius: 4px;">
            </td>
            <td style="padding: 15px 10px; border-bottom: 1px solid #eeeeee;">
                <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.4;">${item.name || 'Product'}</p>
            </td>
            <td style="padding: 15px 10px; border-bottom: 1px solid #eeeeee; text-align: center; color: #666666; font-size: 14px;">
                ×${item.quantity}
            </td>
            <td style="padding: 15px 0; border-bottom: 1px solid #eeeeee; text-align: right; color: #333333; font-weight: 600; font-size: 14px; white-space: nowrap;">
                ${Number(item.price * item.quantity).toFixed(2)} AED
            </td>
        </tr>
    `).join('');

    // Conditional Bank Details - only show if NOT paid and payment method is bank_transfer
    const bankDetailsHtml = (paymentMethod === 'bank_transfer' || paymentMethod === 'bank') && !isPaid ? `
        <div style="margin-top: 25px; color: #444444; font-size: 14px; line-height: 1.6;">
            <p>Make your payment directly into our bank account. Please use your <strong>Order ID</strong> as the payment reference. Your <strong>order</strong> will not be shipped until the funds have cleared in our account.</p>
            <h3 style="color: #333333; font-size: 16px; margin: 20px 0 10px;">Our bank details</h3>
            <p style="margin: 5px 0; font-weight: bold; color: #e11d48;">MARIOT KITCHEN EQUIP:</p>
            <ul style="list-style: none; padding: 0; margin: 10px 0;">
                <li style="margin-bottom: 5px;">• Bank: <strong>ADIB</strong></li>
                <li style="margin-bottom: 5px;">• Account number: <strong>17871825</strong></li>
                <li style="margin-bottom: 5px;">• IBAN: <strong>AE54050000000017871825</strong></li>
                <li style="margin-bottom: 10px;">• BIC: <strong>ADUIAEAD</strong></li>
            </ul>
        </div>
    ` : '';

    const mailOptions = {
        from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: isPaid ? `Payment Confirmed — Order #${orderId} — Mariot Store` : `Order Confirmation #${orderId} — Mariot Store`,
        text: isPaid
            ? `Hi ${userName},\n\nPayment for your order #${orderId} has been confirmed. Your total is AED ${total}.\n\nBest regards,\nMariot Store Team`
            : `Hi ${userName},\n\nThank you for your order!\n\nYour order #${orderId} has been successfully placed. Your total is AED ${total}.\n\nBest regards,\nMariot Store Team`,
        html: `
            <div style="background-color: #f4f4f4; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; color: #000000; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    
                    <!-- Logo -->
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="https://mariotstore.com/wp-content/uploads/2024/10/kitchen-equipment-store.png" alt="MARIOT" style="width: 220px; height: auto;">
                        <h2 style="font-size: 24px; color: #000000; margin: 20px 0 5px; font-weight: 700;">Thank you for your <span style="background-color: #fff9c4; padding: 0 4px;">order</span></h2>
                    </div>

                <p style="font-size: 15px; color: #000000; font-weight: 500;">Hi ${userName},</p>
                
                <p style="font-size: 15px; color: #000000; line-height: 1.6;">
                    ${isPaid
                ? `Great news! We've confirmed your payment for <span style="background-color: #fff9c4; padding: 0 2px;">order</span> #${orderId}. We are now preparing your items for delivery.`
                : `We've received your <span style="background-color: #fff9c4; padding: 0 2px;">order</span> and it's currently on hold until we can <span style="background-color: #fff9c4; padding: 0 2px;">confirm</span> your payment has been processed.`}
                </p>

                <p style="font-size: 15px; color: #000000;">Here's a reminder of what you've ordered:</p>

                ${bankDetailsHtml}

                <div style="margin-top: 30px;">
                    <h3 style="font-size: 18px; color: #000000; border-bottom: 2px solid #000000; display: inline-block; padding-bottom: 2px; margin-bottom: 15px;"><span style="background-color: #fff9c4; padding: 0 4px;">Order</span> summary</h3>
                    <p style="font-size: 12px; color: #1e293b; margin-bottom: 20px; font-weight: 600;"><span style="background-color: #fff9c4; padding: 0 2px;">Order</span> #${orderId} (${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})</p>

                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="text-align: left; font-size: 13px; color: #1e293b; font-weight: bold; padding-bottom: 10px;">Product</th>
                                <th style="padding-bottom: 10px;"></th>
                                <th style="text-align: center; font-size: 13px; color: #1e293b; font-weight: bold; padding-bottom: 10px;">Quantity</th>
                                <th style="text-align: right; font-size: 13px; color: #1e293b; font-weight: bold; padding-bottom: 10px;">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemRows}
                        </tbody>
                    </table>

                    <div style="margin-top: 20px; border-top: 1px solid #000000;">
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                            <tr>
                                <td style="padding: 8px 0; color: #000000; font-size: 15px; font-weight: bold;">Subtotal:</td>
                                <td style="padding: 8px 0; text-align: right; color: #000000; font-size: 15px;">${subtotal} AED</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #000000; font-size: 15px; font-weight: bold;">VAT:</td>
                                <td style="padding: 8px 0; text-align: right; color: #000000; font-size: 15px;">${vat} AED</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 0; color: #000000; font-size: 18px; font-weight: 900;">Total:</td>
                                <td style="padding: 12px 0; text-align: right; color: #000000; font-size: 22px; font-weight: 900;">${total} AED</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #000000; font-size: 15px; font-weight: bold;">Payment method:</td>
                                <td style="padding: 8px 0; text-align: right; color: #000000; font-size: 15px;">${paymentDisplay}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #000000;">
                    <h3 style="font-size: 16px; color: #000000; margin-bottom: 15px; font-weight: 900;">Billing address</h3>
                    <div style="background-color: #fff; border: 1px solid #000000; padding: 15px; border-radius: 4px; font-size: 15px; color: #000000; line-height: 1.6;">
                        <p style="margin: 0; font-weight: 800; color: #000000;">${billing.firstName || userName} ${billing.lastName || ''}</p>
                        <p style="margin: 0;">${billing.streetAddress || ''}</p>
                        <p style="margin: 0;">${billing.city || ''}</p>
                        <p style="margin: 0;">${billing.country || ''}</p>
                        <p style="margin: 5px 0 0;"><a href="tel:${billing.phone}" style="color: #0ea5e9; text-decoration: underline;">${billing.phone || ''}</a></p>
                        <p style="margin: 0;"><a href="mailto:${toEmail}" style="color: #0ea5e9; text-decoration: underline;">${toEmail}</a></p>
                    </div>
                </div>

                <div style="margin-top: 40px; text-align: center; border-top: 2px solid #000000; padding-top: 25px; color: #000000; font-size: 15px; line-height: 1.6;">
                    <p>Thanks again! If you need any help with your <span style="background-color: #fff9c4; padding: 0 2px;">order</span>, please contact us at <a href="mailto:admin@mariotkitchen.com" style="color: #0ea5e9; text-decoration: underline;">admin@mariotkitchen.com</a>.</p>
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
        console.log(`[EMAIL] ✅ Order confirmation email sent to ${toEmail}`);
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send order confirmation email to ${toEmail}:`, error.message);
        throw error;
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

module.exports = {
    sendPasswordResetEmail,
    sendOrderConfirmationEmail,
    sendWelcomeEmail,
    verifySmtpConnection,
    sendQuotationEmail,
    sendEmail
};

const nodemailer = require('nodemailer');
const dns = require('dns');
const dnsp = require('dns').promises;

// SMTP provider is configurable via env so we can switch between Gmail,
// Hostinger, etc. without code changes.
//   SMTP_HOST     e.g. smtp.hostinger.com  (default smtp.gmail.com)
//   SMTP_PORT     465 (SSL) or 587 (STARTTLS) — default 587
//   SMTP_EMAIL    full mailbox address, also used as the From address
//   SMTP_PASSWORD mailbox password / app password
const SMTP_HOSTNAME = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = SMTP_PORT === 465; // implicit TLS on 465, STARTTLS otherwise

// Some hosts (e.g. Render) can't route IPv6 to the SMTP server (ENETUNREACH).
// Force Node to prefer IPv4 results.
try { dns.setDefaultResultOrder('ipv4first'); } catch (_) { /* older Node — ignore */ }

// Belt-and-suspenders: pre-resolve the SMTP host to an IPv4 address at startup
// and connect to that IP directly. SMTPConnection's `family`/`lookup` options
// are not always honored on Render, so we bypass runtime DNS entirely.
let cachedSmtpHost = null;
let smtpHostResolveAt = 0;
const SMTP_HOST_TTL_MS = 30 * 60 * 1000; // re-resolve every 30 minutes
async function getSmtpHost() {
    const now = Date.now();
    if (cachedSmtpHost && (now - smtpHostResolveAt) < SMTP_HOST_TTL_MS) return cachedSmtpHost;
    try {
        const ips = await dnsp.resolve4(SMTP_HOSTNAME);
        if (ips && ips.length) {
            cachedSmtpHost = ips[Math.floor(Math.random() * ips.length)];
            smtpHostResolveAt = now;
            console.log(`[EMAIL] Resolved ${SMTP_HOSTNAME} → ${cachedSmtpHost} (IPv4)`);
            return cachedSmtpHost;
        }
    } catch (e) {
        console.error(`[EMAIL] IPv4 resolve failed for ${SMTP_HOSTNAME}:`, e.message);
    }
    return SMTP_HOSTNAME;
}

// Kick off the initial resolution so the first send already has the IP cached.
getSmtpHost().catch(() => {});

// Mobile-responsive overrides injected into EVERY outgoing email. On phones the
// fixed 600px cards must go full width with no card border/radius/shadow/margin,
// and the chunky desktop side padding is reduced so content isn't cramped.
// Targets both `.container` wrappers and any inline 600px table/div wrapper.
const RESPONSIVE_EMAIL_STYLE = `
<style>
@media only screen and (max-width:600px){
    .container,
    table[width="600"],
    [style*="max-width: 600px"],
    [style*="max-width:600px"]{
        width:100% !important;
        max-width:100% !important;
        border:0 !important;
        border-radius:0 !important;
        box-shadow:none !important;
        margin:0 !important;
    }
    [style*="padding: 40px"]{ padding:24px 18px !important; }
    [style*="padding:40px 45px"],
    [style*="padding:40px 30px"],
    [style*="padding: 40px 30px"]{ padding:24px 18px !important; }
    [style*="padding:30px 40px"]{ padding:22px 18px !important; }
    body, .email-bg, table[style*="padding:40px 0"]{ padding-left:0 !important; padding-right:0 !important; }
    .cta-btn{ display:block !important; width:100% !important; box-sizing:border-box !important; }
    /* Footer: full width, no card border on mobile */
    .email-footer{ width:100% !important; border:0 !important; border-radius:0 !important; }
    .email-footer-pad{ padding:24px 18px !important; }
    /* Content cells: shrink chunky desktop side padding so content fills width */
    .content-pad{ padding-left:18px !important; padding-right:18px !important; padding-top:24px !important; padding-bottom:24px !important; }
}
</style>`;

// Put the responsive overrides inside <head> so Gmail (incl. the Android/Samsung
// app) keeps them — Gmail strips <style> that sits loose in the body. Templates
// that ship a full doc get the style appended to <head>; bare-fragment templates
// (no <head>) get wrapped in a minimal doc with a viewport meta + the style.
const injectResponsive = (html) => {
    if (typeof html !== 'string' || !html) return html;
    if (html.includes('</head>')) return html.replace('</head>', `${RESPONSIVE_EMAIL_STYLE}</head>`);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${RESPONSIVE_EMAIL_STYLE}</head><body style="margin:0;padding:0;">${html}</body></html>`;
};

const createTransporter = () => {
    // Sync access to the most recently cached IP. Falls back to the hostname
    // on the very first request before resolution completes (rare; the
    // top-level getSmtpHost() call above usually resolves before any email).
    const host = cachedSmtpHost || SMTP_HOSTNAME;
    const transporter = nodemailer.createTransport({
        host,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        requireTLS: !SMTP_SECURE, // STARTTLS upgrade required on port 587
        family: 4,
        tls: {
            // We're connecting by IP, so verify the cert against the real hostname
            servername: SMTP_HOSTNAME,
            rejectUnauthorized: false
        },
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD
        },
        // Fail fast instead of letting requests hang for the platform default
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000
    });

    // Auto-inject the mobile-responsive <style> into every email's HTML so all
    // templates render full-width and border-less on phones without per-template edits.
    const originalSendMail = transporter.sendMail.bind(transporter);
    transporter.sendMail = (options, callback) => {
        if (options && options.html) options = { ...options, html: injectResponsive(options.html) };
        return originalSendMail(options, callback);
    };

    return transporter;
};

// Inline logo as a `cid:` attachment. Email clients (Gmail, Outlook) don't render
// .webp, so a referenced webp URL shows as a broken image. The PNG attachment
// renders reliably everywhere. Reference it in HTML via <img src="cid:mariotEmailLogo">.
const path = require('path');
const fs = require('fs');

// Resolve an asset across deploy layouts. On prod only the backend is deployed,
// so the sibling `frontend/public` path doesn't exist — fall back to the copy
// bundled in backend/assets. Returns the first existing path, or null.
const resolveAsset = (...candidates) => {
    for (const p of candidates) {
        try { if (p && fs.existsSync(p)) return p; } catch (_) { /* ignore */ }
    }
    return null;
};

const LOGO_EN_PATH = resolveAsset(
    path.join(__dirname, '../assets/mariot-logo.png'),
    path.join(__dirname, '../../frontend/public/assets/mariot-logo.png')
);
const LOGO_AR_PATH = resolveAsset(
    path.join(__dirname, '../assets/MARIOT-A.png'),
    path.join(__dirname, '../../frontend/public/MARIOT-A.png')
);

// Inline logo as a `cid:` attachment. Email clients (Gmail, Outlook) don't render
// .webp, so a referenced webp URL shows as a broken image. The PNG attachment
// renders reliably everywhere. Reference it in HTML via <img src="cid:mariotEmailLogo">.
// Returns null when the file is missing so the mail still sends (logo just won't inline).
const emailLogoAttachment = () => (
    LOGO_EN_PATH ? { filename: 'mariot-logo.png', path: LOGO_EN_PATH, cid: 'mariotEmailLogo' } : null
);

// --- Email localization helpers ---
// Emails are sent in the recipient's chosen site language (en | ar).
const isAr = (locale) => String(locale || 'en').toLowerCase().startsWith('ar');
// dir/text-align to inject on the email body so Arabic renders right-to-left.
const dirAttr = (ar) => (ar ? 'rtl' : 'ltr');
const alignStart = (ar) => (ar ? 'right' : 'left');

// Shared email footer — "Get in touch / Email / Website" + copyright + socials
// (same design as the invoice mail). Standalone, centered, 600px. Single source
// so every mail uses the same footer. The .container class (mobile width) only
// applies when the email's <head> includes the responsive <style> block;
// without it the footer still renders fine on desktop and degrades gracefully.
const emailFooter = () => {
    const SITE = process.env.FRONTEND_URL || 'https://mariotstore.com';
    return `
    <table role="presentation" width="100%" class="email-footer" cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
        <tr>
            <td class="email-footer-pad" style="padding:30px 40px;">
                <!-- Fluid-hybrid columns: sit side-by-side on desktop, stack on mobile
                     (inline-block wraps when container narrower than the two max-widths).
                     Works without a media query, so it also stacks in mails that have no <style>. -->
                <div style="text-align:left;font-size:0;margin-bottom:10px;">
                    <!-- Get in touch -->
                    <div style="display:inline-block;width:100%;max-width:260px;vertical-align:top;text-align:left;margin-bottom:16px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td width="45" style="vertical-align:top;">
                                    <div style="background:#e0f2fe;width:32px;height:32px;border-radius:6px;text-align:center;">
                                        <img src="https://cdn-icons-png.flaticon.com/32/724/724664.png" style="width:16px;margin-top:8px;opacity:0.8;">
                                    </div>
                                </td>
                                <td>
                                    <div style="font-size:13px;font-weight:700;color:#333;margin-bottom:4px;">Get in touch</div>
                                    <div style="font-size:12px;color:#666;line-height:1.7;">
                                        <a href="tel:0428882777" style="color:#666;text-decoration:none;">0428882777</a><br>
                                        <a href="tel:0503114080" style="color:#666;text-decoration:none;">0503114080</a>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </div>
                    <!-- Email + Website -->
                    <div style="display:inline-block;width:100%;max-width:260px;vertical-align:top;text-align:left;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:15px;">
                            <tr>
                                <td width="45" style="vertical-align:top;">
                                    <div style="background:#e0f2fe;width:32px;height:32px;border-radius:6px;text-align:center;">
                                        <img src="https://cdn-icons-png.flaticon.com/32/732/732200.png" style="width:16px;margin-top:8px;opacity:0.8;">
                                    </div>
                                </td>
                                <td>
                                    <div style="font-size:13px;font-weight:700;color:#333;margin-bottom:2px;">Email</div>
                                    <a href="mailto:support@mariotstore.com" style="font-size:12px;color:#3b82f6;text-decoration:none;">support@mariotstore.com</a>
                                </td>
                            </tr>
                        </table>
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td width="45" style="vertical-align:top;">
                                    <div style="background:#e0f2fe;width:32px;height:32px;border-radius:6px;text-align:center;">
                                        <img src="https://cdn-icons-png.flaticon.com/32/1006/1006771.png" style="width:16px;margin-top:8px;opacity:0.8;">
                                    </div>
                                </td>
                                <td>
                                    <div style="font-size:13px;font-weight:700;color:#333;margin-bottom:2px;">Website</div>
                                    <a href="${SITE}" style="font-size:12px;color:#3b82f6;text-decoration:none;">www.mariotstore.com</a>
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>

                <div style="text-align:center;border-top:1px solid #e2e8f0;padding-top:20px;">
                    <p style="margin:0 0 10px;font-size:11px;color:#888;">© ${new Date().getFullYear()} Mariot Kitchen Equipment. All rights reserved.</p>
                    <div>
                        <a href="https://www.facebook.com/mariotuae" target="_blank" style="text-decoration:none;margin:0 4px;"><img src="https://cdn-icons-png.flaticon.com/32/145/145802.png" alt="Facebook" style="width:18px;opacity:0.8;"></a>
                        <a href="https://www.instagram.com/mariotuae/" target="_blank" style="text-decoration:none;margin:0 4px;"><img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" alt="Instagram" style="width:18px;opacity:0.8;"></a>
                        <a href="https://x.com/MariotUae" target="_blank" style="text-decoration:none;margin:0 4px;"><img src="https://cdn-icons-png.flaticon.com/32/5969/5969020.png" alt="X (Twitter)" style="width:18px;opacity:0.8;"></a>
                        <a href="https://www.youtube.com/channel/UCUCWktTJNpRzUEJ58JHLu_g" target="_blank" style="text-decoration:none;margin:0 4px;"><img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" alt="YouTube" style="width:18px;opacity:0.8;"></a>
                        <a href="https://www.tiktok.com/@mariotmedia" target="_blank" style="text-decoration:none;margin:0 4px;"><img src="https://cdn-icons-png.flaticon.com/32/3046/3046121.png" alt="TikTok" style="width:18px;opacity:0.8;"></a>
                        <a href="https://ae.linkedin.com/in/mariot-kitchen-equipment-8a34a4108" target="_blank" style="text-decoration:none;margin:0 4px;"><img src="https://cdn-icons-png.flaticon.com/32/145/145807.png" alt="LinkedIn" style="width:18px;opacity:0.8;"></a>
                        <a href="https://www.pinterest.com/mariotkitchen/" target="_blank" style="text-decoration:none;margin:0 4px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733564.png" alt="Pinterest" style="width:18px;opacity:0.8;"></a>
                    </div>
                </div>
            </td>
        </tr>
    </table>
`;
};

// Standalone footer for the table-layout mails (order / status / cart / offer),
// where the body is a stack of separate 600px cards. Wraps emailFooter() in a
// centered 600 table so it sits as its own card and lines up with the others.
// The .container class lets it shrink to full width on mobile.
const emailFooterBlock = () => `
    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;margin:0 auto;padding:30px 0;">
        <tr><td>${emailFooter()}</td></tr>
    </table>
`;

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
const sendPasswordResetEmail = async (toEmail, userName, resetUrl, locale = 'en') => {
    const transporter = createTransporter();
    const ar = isAr(locale);
    const L = ar ? {
        subject: 'إعادة تعيين كلمة المرور — متجر ماريوت',
        sub: 'طلب إعادة تعيين كلمة المرور',
        hi: 'مرحباً',
        intro: 'تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في متجر ماريوت. اضغط الزر أدناه لتعيين كلمة مرور جديدة.',
        cta: 'إعادة تعيين كلمة المرور',
        expiry: '⏱ ستنتهي صلاحية هذا الرابط خلال 15 دقيقة',
        ignore: 'إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان. ستبقى كلمة مرورك دون تغيير.',
        fallback: 'إذا لم يعمل الزر، انسخ هذا الرابط والصقه في المتصفح:',
        text: `مرحباً ${userName}،\n\nطلبت إعادة تعيين كلمة المرور لحسابك في متجر ماريوت.\n\nاضغط الرابط أدناه لتعيين كلمة مرور جديدة. ينتهي الرابط خلال 15 دقيقة.\n\n${resetUrl}\n\nإذا لم تطلب ذلك، تجاهل هذه الرسالة.\n\nفريق متجر ماريوت`
    } : {
        subject: 'Reset Your Password — Mariot Store',
        sub: 'Password Reset Request',
        hi: 'Hi',
        intro: 'We received a request to reset the password associated with your Mariot Store account. Click the button below to set a new password.',
        cta: 'Reset My Password',
        expiry: '⏱ This link will expire in 15 minutes',
        ignore: "If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.",
        fallback: "If the button doesn't work, copy and paste this link into your browser:",
        text: `Hi ${userName},\n\nYou requested a password reset for your Mariot Store account.\n\nPlease click the link below to set a new password. This link will expire in 15 minutes.\n\n${resetUrl}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n\nBest regards,\nMariot Store Team`
    };

    const mailOptions = {
        from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: L.subject,
        text: L.text,
        html: `
            <div dir="${dirAttr(ar)}" class="container" style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: ${alignStart(ar)};">
                <!-- Header -->
                <div class="content-pad" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Mariot Store</h1>
                    <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px;">${L.sub}</p>
                </div>

                <!-- Body -->
                <div class="content-pad" style="padding: 40px 30px; background-color: #ffffff;">
                    <p style="color: #334155; font-size: 16px; margin-top: 0;">${L.hi} <strong>${userName}</strong>,</p>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                        ${L.intro}
                    </p>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${resetUrl}"
                           style="display: inline-block; background: linear-gradient(135deg, #56cfe1, #4abccb); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(86, 207, 225, 0.4);">
                            ${L.cta}
                        </a>
                    </div>

                    <!-- Expiry notice -->
                    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; border-${alignStart(ar)}: 4px solid #f59e0b; margin: 20px 0;">
                        <p style="color: #92400e; font-size: 13px; margin: 0; font-weight: 600;">
                            ${L.expiry}
                        </p>
                    </div>

                    <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
                        ${L.ignore}
                    </p>

                    <!-- Fallback link -->
                    <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px;">
                            ${L.fallback}
                        </p>
                        <p style="color: #56cfe1; font-size: 12px; word-break: break-all; margin: 0;" dir="ltr">
                            ${resetUrl}
                        </p>
                    </div>
                </div>

            </div>
            <!-- Footer as its own full-width block -->
            ${emailFooterBlock()}
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
const sendOrderConfirmationEmail = async (toEmail, userName, orderId, finalAmount, orderItems = [], orderData = {}, locale = 'en') => {
    const transporter = createTransporter();
    const isAdminCopy = orderData.is_admin_copy === true;
    const ar = !isAdminCopy && isAr(locale); // admin back-office copy stays English

    const subtotalNum = Number(orderData.total_amount || 0);
    const vatNum = Number(orderData.vat_amount || 0);
    const totalNum = Number(finalAmount || 0);
    // Combined discount (coupon + reward points), derived from the stored amounts so the
    // summary always reconciles:  items − discount + VAT = total.
    const discountNum = Math.max(0, subtotalNum - (totalNum - vatNum));
    const subtotal = subtotalNum.toFixed(2);
    const vat = vatNum.toFixed(2);
    const discount = discountNum.toFixed(2);
    const total = totalNum.toFixed(2);
    const date = new Date(orderData.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const billing = orderData.billing_details || {};
    const shipping = orderData.shipping_address || billing;
    const isPaid = (orderData.payment_status === 'paid' || orderData.payment_status === 'PAID');
    const isAdmin = orderData.is_admin_copy === true;

    const L = ar ? {
        subjectPaid: `✅ تم تأكيد الدفع — طلب #${orderId} — متجر ماريوت`,
        subjectNew: `🛒 تأكيد الطلب #${orderId} — متجر ماريوت`,
        thankTitle: 'شكراً لطلبك!',
        dear: 'عزيزي',
        thankBody: `شكراً لتقديمك الطلب <strong>#${orderId}</strong> لدى ماريوت!`,
        received: 'لقد استلمنا طلبك وسنرسل لك تأكيد التسليم بمجرد شحنه.',
        invoice: 'يمكنك <a href="#" style="color:#16A1DB;text-decoration:underline;">تحميل الفاتورة الضريبية من هنا.</a>',
        regards: 'مع خالص التحية،<br><strong>فريق ماريوت</strong>',
        orderDetail: 'تفاصيل الطلب', orderNo: 'رقم الطلب', dateL: 'التاريخ', totalL: 'الإجمالي',
        by: 'بواسطة:', delivery: 'توصيل ماريوت (قياسي)',
        summary: 'الملخص', itemsL: 'المنتجات', shipping: 'رسوم الشحن', discountL: 'الخصم', vatL: 'إجمالي ضريبة القيمة المضافة',
        totalVat: 'الإجمالي', vatIncl: 'شامل الضريبة',
        deliveryAddr: 'عنوان التوصيل', billingAddr: 'عنوان الفوترة', paymentL: 'الدفع'
    } : {
        subjectPaid: `✅ Payment Confirmed — Order #${orderId} — Mariot Store`,
        subjectNew: `🛒 Order Confirmation #${orderId} — Mariot Store`,
        thankTitle: 'Thank you for your order!',
        dear: 'Dear',
        thankBody: `Thank you for placing your order <strong>#${orderId}</strong> with us at Mariot!`,
        received: 'We have received your order and we will send you a delivery confirmation as soon as it has been dispatched.',
        invoice: 'You can <a href="#" style="color:#16A1DB;text-decoration:underline;">Download the Tax Invoice here.</a>',
        regards: 'Kind regards,<br><strong>Your Mariot Team</strong>',
        orderDetail: 'Order Detail', orderNo: 'Order #', dateL: 'Date', totalL: 'Total',
        by: 'by:', delivery: 'Mariot Delivery (Standard)',
        summary: 'Summary', itemsL: 'Items', shipping: 'Shipping fees', discountL: 'Discount', vatL: 'Total VAT amount',
        totalVat: 'Total', vatIncl: 'VAT included',
        deliveryAddr: 'Delivery Address', billingAddr: 'Billing Address', paymentL: 'Payment'
    };
    const freeLabel = ar ? 'مجاني' : 'FREE';
    const freeGiftWith = ar ? 'هدية مجانية مع' : 'Free gift with';

    const paymentDisplay = (ar ? {
        'bank_transfer': 'تحويل بنكي مباشر',
        'cod': 'الدفع عند الاستلام',
        'tabby': 'تابي (أقساط)',
        'card': 'بطاقة ائتمان/خصم'
    } : {
        'bank_transfer': 'Direct bank transfer',
        'cod': 'Cash on Delivery',
        'tabby': 'Tabby (Installments)',
        'card': 'Credit/Debit Card'
    })[orderData.payment_method] || orderData.payment_method || 'N/A';

    const itemRows = orderItems.map(item => {
        const isFree = Number(item.is_free_gift) === 1;
        const lineTotal = Number((item.price_at_purchase || item.price || 0) * item.quantity).toFixed(2);
        const parentName = item.bundle_parent_name || '';
        const nameBlock = isFree
            ? `<p style="margin:0;font-size:13px;color:#475569;line-height:1.4;">${item.name}
                   <span style="display:inline-block;margin-left:6px;padding:2px 6px;background-color:#10b981;color:#fff;font-size:10px;font-weight:700;border-radius:4px;letter-spacing:0.4px;">${freeLabel}</span>
               </p>
               ${parentName ? `<p style="margin:3px 0 0;font-size:11px;color:#94a3b8;">${freeGiftWith} ${parentName}</p>` : ''}`
            : `<p style="margin:0;font-size:13px;color:#475569;line-height:1.4;">${item.name}</p>`;
        const priceBlock = isFree
            ? `<p style="margin:0;font-size:13px;font-weight:700;color:#10b981;">${freeLabel}</p>`
            : `<p style="margin:0;font-size:13px;font-weight:700;color:#0f172a;">AED ${lineTotal}</p>`;
        return `
        <div style="padding:15px;border-bottom:1px solid #f1f5f9;">
             <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td width="60" style="vertical-align:middle;">
                        <img src="${item.image || 'cid:mariotEmailLogo'}" width="50" height="50" style="border-radius:4px;object-fit:contain;background-color:#ffffff;">
                    </td>
                    <td style="padding-left:15px;vertical-align:middle;">
                        ${nameBlock}
                    </td>
                    <td width="40" align="center" style="vertical-align:middle;">
                        <span style="display:inline-block;padding:2px 6px;background-color:#f1f5f9;color:#64748b;font-size:11px;font-weight:700;border-radius:4px;">x${item.quantity}</span>
                    </td>
                    <td align="right" style="vertical-align:middle;width:80px;">
                        ${priceBlock}
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
                .cta-btn { display: block !important; width: 100% !important; padding: 16px 12px !important; font-size: 15px !important; box-sizing: border-box !important; }
            }
        </style>
    </head>
    <body dir="${dirAttr(ar)}" style="margin:0;padding:0;background-color:#f4f7f9;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;text-align:${alignStart(ar)};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f9;padding:40px 0;">
            <tr>
                <td align="center">
                    <!-- Top Card -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;margin-bottom:25px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                            <td align="center" style="padding:30px 0;border-bottom:1px solid #f1f5f9;">
                                <img src="cid:mariotEmailLogo" alt="Mariot" style="height:45px;">
                            </td>
                        </tr>
                        <tr>
                            <td class="content-pad" style="padding:40px 45px;">
                                ${isAdminCopy ? `
                                <h1 style="margin:0 0 25px;font-size:20px;font-weight:600;color:#0f172a;">🔔 New Order Received</h1>
                                <p style="margin:0 0 15px;font-size:14px;color:#475569;line-height:1.6;">
                                    A new order <strong>#${orderId}</strong> has just been placed on Mariot Store.
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f8fafc;border-radius:8px;">
                                    <tr><td style="padding:14px 16px;font-size:13px;color:#475569;line-height:1.8;">
                                        <strong>Customer:</strong> ${userName}<br>
                                        ${billing.email ? `<strong>Email:</strong> ${billing.email}<br>` : ''}
                                        ${(shipping.phone || billing.phone) ? `<strong>Phone:</strong> ${shipping.phone || billing.phone}<br>` : ''}
                                        <strong>Payment:</strong> ${paymentDisplay}${isPaid ? ' (Paid)' : ''}<br>
                                        <strong>Total:</strong> AED ${total}
                                    </td></tr>
                                </table>
                                <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
                                    Review and process it in the <strong>admin dashboard</strong>. Full order details below.
                                </p>
                                ` : `
                                <h1 style="margin:0 0 25px;font-size:20px;font-weight:600;color:#334155;">${L.thankTitle}</h1>
                                <p style="margin:0 0 20px;font-size:14px;color:#475569;">${L.dear} ${userName},</p>
                                <p style="margin:0 0 15px;font-size:14px;color:#475569;line-height:1.6;">
                                    ${L.thankBody}
                                </p>
                                <p style="margin:0 0 15px;font-size:14px;color:#475569;line-height:1.6;">
                                    ${L.received}
                                </p>
                                <p style="margin:0 0 25px;font-size:14px;color:#475569;line-height:1.6;">
                                    ${L.invoice}
                                </p>
                                <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
                                    ${L.regards}
                                </p>
                                `}
                            </td>
                        </tr>
                    </table>

                    <!-- Order Detail Card -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                            <td class="content-pad" style="padding:40px 45px;">
                                <h2 style="margin:0 0 35px;font-size:18px;font-weight:600;color:#64748b;text-align:center;">${L.orderDetail}</h2>

                                <!-- Meta Row -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-top:1px solid #e2e8f0;padding:15px 0;">
                                    <tr>
                                        <td style="text-align:${alignStart(ar)};"><span style="font-size:11px;color:#94a3b8;text-transform:uppercase;">${L.orderNo}</span><br><span style="font-size:13px;color:#334155;font-weight:600;">${orderId}</span></td>
                                        <td align="center"><span style="font-size:11px;color:#94a3b8;text-transform:uppercase;">${L.dateL}</span><br><span style="font-size:13px;color:#334155;font-weight:600;">${date}</span></td>
                                        <td style="text-align:${ar ? 'left' : 'right'};"><span style="font-size:11px;color:#94a3b8;text-transform:uppercase;">${L.totalL}</span><br><span style="font-size:13px;color:#334155;font-weight:600;">AED ${total}</span></td>
                                    </tr>
                                </table>

                                <!-- Products -->
                                <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:30px;">
                                    <div style="padding:10px 15px;background-color:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">
                                        ${L.by} <span style="color:#334155;font-weight:600;">${L.delivery}</span>
                                    </div>
                                    ${itemRows}
                                </div>

                                <!-- Summary Table -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:35px;border-bottom:1px solid #e2e8f0;padding-bottom:15px;">
                                    <tr><td colspan="2" style="padding-bottom:15px;font-size:14px;font-weight:700;color:#334155;text-align:${alignStart(ar)};">${L.summary}</td></tr>
                                    <tr><td style="padding:5px 0;font-size:13px;color:#64748b;">${L.itemsL}</td><td style="padding:5px 0;font-size:13px;color:#334155;text-align:${ar ? 'left' : 'right'};">AED ${subtotal}</td></tr>
                                    <tr><td style="padding:5px 0;font-size:13px;color:#64748b;">${L.shipping}</td><td style="padding:5px 0;font-size:13px;color:#334155;text-align:${ar ? 'left' : 'right'};">AED 0.00</td></tr>
                                    ${Number(discount) > 0 ? `<tr><td style="padding:5px 0;font-size:13px;color:#64748b;">${L.discountL}</td><td style="padding:5px 0;font-size:13px;color:#ef4444;text-align:${ar ? 'left' : 'right'};">-AED ${discount}</td></tr>` : ''}
                                    <tr><td style="padding:5px 0;font-size:13px;color:#64748b;">${L.vatL}</td><td style="padding:5px 0;font-size:13px;color:#334155;text-align:${ar ? 'left' : 'right'};">AED ${vat}</td></tr>
                                    <tr style="font-weight:700;"><td style="padding:15px 0 5px;font-size:15px;color:#0f172a;">${L.totalVat} <span style="font-size:11px;font-weight:400;color:#64748b;">${L.vatIncl}</span></td><td style="padding:15px 0 5px;font-size:18px;color:#0f172a;text-align:${ar ? 'left' : 'right'};">AED ${total}</td></tr>
                                </table>

                                <!-- Addresses -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                                    <tr>
                                        <td width="50%" style="vertical-align:top;padding-${ar ? 'left' : 'right'}:20px;">
                                            <h4 style="margin:0 0 12px;font-size:15px;color:#64748b;font-weight:600;">${L.deliveryAddr}</h4>
                                            <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                                                ${shipping.firstName || userName} ${shipping.lastName || ''}<br>
                                                ${shipping.streetAddress || ''}<br>
                                                ${shipping.city || ''}<br>
                                                ${shipping.phone || ''}
                                            </p>
                                        </td>
                                        <td width="50%" style="vertical-align:top;">
                                            <h4 style="margin:0 0 12px;font-size:15px;color:#64748b;font-weight:600;">${L.billingAddr}</h4>
                                            <p style="margin:0 0 15px;font-size:13px;color:#475569;line-height:1.6;">
                                                ${billing.firstName || userName} ${billing.lastName || ''}<br>
                                                ${billing.streetAddress || ''}<br>
                                                ${billing.city || ''}
                                            </p>
                                            <h4 style="margin:0 0 8px;font-size:15px;color:#64748b;font-weight:600;">${L.paymentL}</h4>
                                            <p style="margin:0;font-size:13px;color:#475569;">${paymentDisplay}</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <!-- Footer -->
                    ${emailFooterBlock()}
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({ from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`, to: toEmail, subject: isAdminCopy ? `🔔 NEW ORDER RECEIVED — #${orderId}` : (isPaid ? L.subjectPaid : L.subjectNew), html, attachments: [emailLogoAttachment()].filter(Boolean) });
        console.log(`[EMAIL] ✅ Order confirmation email sent to ${toEmail}`);
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send order confirmation email to ${toEmail}:`, error.message);
    }
};


/**
 * Send a welcome email to the new user
 */
const sendWelcomeEmail = async (toEmail, userName, locale = 'en') => {
    const transporter = createTransporter();
    const ar = isAr(locale);
    const L = ar ? {
        subject: `مرحباً بك في متجر ماريوت، ${userName.split(' ')[0]}! 🥳`,
        text: `مرحباً ${userName}،\n\nأهلاً بك في متجر ماريوت! سعداء بانضمامك إلينا.\n\nفريق متجر ماريوت`,
        welcomeTitle: 'مرحباً بك في',
        hi: 'مرحباً',
        intro: 'يسعدنا انضمامك إلى عائلة <strong>متجر ماريوت</strong>! لقد فتحت عالماً من معدات المطابخ الفاخرة ومكافآت الأعضاء الحصرية.',
        whatsNext: 'ما التالي؟',
        li1: '<strong>تسوّق الأفضل</strong>: استكشف أحدث مجموعتنا من معدات المطابخ الاحترافية.',
        li2: '<strong>اكسب المكافآت</strong>: حصلت بالفعل على <strong>1,000 نقطة ترحيبية</strong>! استخدمها في طلبك الأول.',
        li3: '<strong>دفع سريع</strong>: احفظ عناوينك لتجربة تسوق فائقة السرعة.',
        cta: 'ابدأ التسوق الآن',
        support: 'إذا كان لديك أي سؤال، فريق الدعم متواجد دائماً على',
    } : {
        subject: `Welcome to Mariot Store, ${userName.split(' ')[0]}! 🥳`,
        text: `Hi ${userName},\n\nWelcome to Mariot Store! We're thrilled to have you with us.\n\nBest regards,\nMariot Store Team`,
        welcomeTitle: 'Welcome to',
        hi: 'Hi',
        intro: "We're absolutely thrilled to have you join the <strong>Mariot Store</strong> family! You've just unlocked a world of premium kitchen equipment and exclusive member rewards.",
        whatsNext: "What's next?",
        li1: '<strong>Shop Premium</strong>: Explore our latest collection of professional kitchen gear.',
        li2: "<strong>Earn Rewards</strong>: You've already earned <strong>1,000 welcome points</strong>! Use them on your first order.",
        li3: '<strong>Fast Checkout</strong>: Save your addresses for a lightning-fast shopping experience.',
        cta: 'Start Shopping Now',
        support: 'If you have any questions, our support team is always here for you at',
    };

    const mailOptions = {
        from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: L.subject,
        text: L.text,
        html: `
            <div dir="${dirAttr(ar)}" style="background-color: #f4f4f4; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div class="container content-pad" style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; color: #000000; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: ${alignStart(ar)};">

                    <!-- Logo -->
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="https://mariotstore.com/wp-content/uploads/2024/10/kitchen-equipment-store.png" alt="MARIOT" style="width: 220px; height: auto;">
                        <h2 style="font-size: 24px; color: #000000; margin: 20px 0 5px; font-weight: 700;">${L.welcomeTitle} <span style="background-color: #fff9c4; padding: 0 4px;">Mariot</span>!</h2>
                    </div>

                    <p style="font-size: 16px; color: #000000; font-weight: 600;">${L.hi} ${userName},</p>

                    <p style="font-size: 15px; color: #000000; line-height: 1.6;">
                        ${L.intro}
                    </p>

                    <div style="background-color: #fafafa; border-radius: 8px; padding: 25px; margin: 30px 0; border: 1px solid #eeeeee;">
                        <h3 style="margin-top: 0; color: #000000; font-size: 16px;">${L.whatsNext}</h3>
                        <ul style="padding-${alignStart(ar)}: 20px; color: #1e293b; font-size: 14px; line-height: 1.6;">
                            <li style="margin-bottom: 10px;">${L.li1}</li>
                            <li style="margin-bottom: 10px;">${L.li2}</li>
                            <li>${L.li3}</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://mariotkitchen.com" style="background-color: #0ea5e9; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">${L.cta}</a>
                    </div>

                    <div style="margin-top: 40px; text-align: center; border-top: 2px solid #000000; padding-top: 25px; color: #000000; font-size: 15px; line-height: 1.6;">
                        <p>${L.support} <a href="mailto:admin@mariotkitchen.com" style="color: #0ea5e9; text-decoration: underline;" dir="ltr">admin@mariotkitchen.com</a>.</p>
                    </div>

                    <div style="margin-top: 30px; text-align: center; color: #1e293b; font-size: 12px; font-weight: bold;">
                        — Mariot Store —
                    </div>
                </div> <!-- Close inner white container -->
                ${emailFooterBlock()}
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
const sendQuotationEmail = async (toEmail, userName, quotationRef, finalAmount, items = [], locale = 'en') => {
    const transporter = createTransporter();
    const ar = isAr(locale);
    const L = ar ? {
        subject: `عرض السعر من متجر ماريوت — ${quotationRef}`,
        title: `عرض سعر #${quotationRef}`,
        dear: 'عزيزي',
        intro: 'شكراً لاختيارك ماريوت لمعدات المطابخ. فيما يلي عرض السعر الذي طلبته لمعدات مطبخك التجاري.',
        product: 'المنتج', qty: 'الكمية', price: 'السعر',
        finalTotal: 'الإجمالي النهائي:',
        note: '<strong>ملاحظة:</strong> هذا العرض صالح لمدة 15 يوماً من تاريخ الإصدار. الأسعار لا تشمل ضريبة القيمة المضافة؛ تُضاف 5% ضريبة على الإجمالي.',
        contact: 'إذا كان لديك أي استفسار أو ترغب بالمتابعة، يرجى الرد على هذه الرسالة أو الاتصال بنا على',
        copyright: '© متجر ماريوت — حلول المطابخ الاحترافية'
    } : {
        subject: `Your Quotation from Mariot Store — ${quotationRef}`,
        title: `Quotation #${quotationRef}`,
        dear: 'Dear',
        intro: 'Thank you for choosing Mariot Kitchen Equipment. Below is the quotation you requested for your commercial kitchen equipment.',
        product: 'Product', qty: 'Qty', price: 'Price',
        finalTotal: 'Final Total:',
        note: '<strong>Note:</strong> This quotation is valid for 15 days from the date of issue. Prices are exclusive of VAT; 5% VAT is added to the total.',
        contact: 'If you have any questions or would like to proceed with this quotation, please reply to this email or call us at',
        copyright: '© Mariot Store — Professional Kitchen Solutions'
    };

    // Map items to rows
    const itemRows = items.map(item => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: ${ar ? 'left' : 'right'};">${Number(item.price).toFixed(2)} AED</td>
        </tr>
    `).join('');

    const mailOptions = {
        from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: L.subject,
        html: `
            <div dir="${dirAttr(ar)}" class="container" style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; text-align: ${alignStart(ar)};">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://mariotstore.com/wp-content/uploads/2024/10/kitchen-equipment-store.png" alt="MARIOT" style="width: 180px;">
                </div>
                <h2 style="color: #333; text-align: center;">${L.title}</h2>
                <p>${L.dear} <strong>${userName}</strong>,</p>
                <p>${L.intro}</p>

                <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
                    <thead>
                        <tr style="background: #f8f8f8;">
                            <th style="padding: 10px; text-align: ${alignStart(ar)}; border-bottom: 2px solid #ddd;">${L.product}</th>
                            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">${L.qty}</th>
                            <th style="padding: 10px; text-align: ${ar ? 'left' : 'right'}; border-bottom: 2px solid #ddd;">${L.price}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="padding: 15px 10px; text-align: ${ar ? 'left' : 'right'}; font-weight: bold;">${L.finalTotal}</td>
                            <td style="padding: 15px 10px; text-align: ${ar ? 'left' : 'right'}; font-weight: bold; color: #e11d48; font-size: 18px;">${Number(finalAmount).toFixed(2)} AED</td>
                        </tr>
                    </tfoot>
                </table>

                <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border-${alignStart(ar)}: 4px solid #e11d48; margin-bottom: 20px;">
                    <p style="margin: 0; color: #991b1b; font-size: 14px;">
                        ${L.note}
                    </p>
                </div>

                <p style="font-size: 14px; color: #666; line-height: 1.6;">
                    ${L.contact} <a href="tel:+97142882777" style="color: #0ea5e9;" dir="ltr">+971 4 288 2777</a>.
                </p>

                <div style="text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; color: #999; font-size: 12px;">
                    <p>${L.copyright}</p>
                </div>
            </div>
            ${emailFooterBlock()}
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
const sendOrderStatusUpdateEmail = async (toEmail, userName, orderId, status, orderData = {}, locale = 'en') => {
    const transporter = createTransporter();
    const ar = isAr(locale);

    const orderItems = orderData.items || [];
    const total = Number(orderData.final_amount || 0).toFixed(2);
    const date = new Date(orderData.created_at || Date.now()).toLocaleDateString(ar ? 'ar-AE' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const billing = orderData.billing_details || {};
    const shipping = orderData.shipping_address || billing;

    const statusMessages = ar ? {
        'processing': 'قيد المعالجة',
        'shipped': 'في الطريق إليك',
        'delivered': 'تم توصيله',
        'cancelled': 'تم إلغاؤه',
        'pending': 'قيد الانتظار'
    } : {
        'processing': 'is being processed',
        'shipped': 'is on its way',
        'delivered': 'has been delivered',
        'cancelled': 'has been cancelled',
        'pending': 'is pending'
    };
    const statusTitles = ar ? {
        'processing': 'قيد المعالجة', 'shipped': 'تم الشحن', 'delivered': 'تم التوصيل',
        'cancelled': 'ملغى', 'pending': 'قيد الانتظار'
    } : {};

    const statusTitle = statusTitles[status.toLowerCase()] || (status.charAt(0).toUpperCase() + status.slice(1));
    const friendlyStatus = statusMessages[status.toLowerCase()] || (ar ? `أصبح ${status}` : `is now ${status}`);

    const L = ar ? {
        subject: orderData.subject || `طلبك #${orderId} ${friendlyStatus} — متجر ماريوت`,
        heading: `تم تحديث حالة طلبك!`,
        dear: 'عزيزي',
        body: `يسعدنا إبلاغك أن طلبك <strong>${orderId}</strong> ${friendlyStatus}!`,
        below: 'تجد تفاصيل الشحن أدناه.',
        thanks: 'شكراً لتسوقك معنا،<br><strong>فريق ماريوت</strong>',
        orderDetail: 'تفاصيل الطلب', orderNo: 'رقم الطلب', dateL: 'التاريخ', totalL: 'الإجمالي',
        deliveryAddr: 'عنوان التوصيل', billingAddr: 'عنوان الفوترة', paymentL: 'الدفع',
        shipmentNo: 'الشحنة رقم 1', trackingId: 'رقم التتبع:', by: 'بواسطة:', delivery: 'توصيل ماريوت (قياسي)',
        estDelivery: 'تاريخ التوصيل المتوقع:', deliveryWord: 'التوصيل',
        cod: 'الدفع عند الاستلام', tabby: 'تابي (أقساط)', card: 'بطاقة ائتمان', freeLabel: 'مجاني', freeGiftWith: 'هدية مجانية مع'
    } : {
        subject: orderData.subject || `Your order #${orderId} ${friendlyStatus} — Mariot Store`,
        heading: `Your order has been ${status}!`,
        dear: 'Dear',
        body: `We're happy to let you know that your order <strong>${orderId}</strong> ${friendlyStatus}!`,
        below: 'Please find your order details for shipment below.',
        thanks: 'Thank you for shopping with us,<br><strong>Mariot Team</strong>',
        orderDetail: 'Order Detail', orderNo: 'Order #', dateL: 'Date', totalL: 'Total',
        deliveryAddr: 'Delivery Address', billingAddr: 'Billing Address', paymentL: 'Payment',
        shipmentNo: 'Shipment No. 1', trackingId: 'Tracking ID:', by: 'by:', delivery: 'Mariot Delivery (Standard)',
        estDelivery: 'Estimated delivery date:', deliveryWord: 'Delivery',
        cod: 'Cash on Delivery', tabby: 'Tabby (Installments)', card: 'Credit Card', freeLabel: 'FREE', freeGiftWith: 'Free gift with'
    };

    // Generate product highlight rows for the Shipment Box
    const itemRows = orderItems.map(item => `
        <div style="padding:15px;display:flex;align-items:center;">
             <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td width="70" style="vertical-align:middle;">
                        <img src="${item.image || 'cid:mariotEmailLogo'}" width="50" height="50" style="border-radius:4px;object-fit:contain;background-color:#ffffff;">
                    </td>
                    <td style="padding-left:15px;vertical-align:middle;">
                        <p style="margin:0;font-size:13px;color:#475569;line-height:1.4;">${item.name}${Number(item.is_free_gift) === 1 ? ` <span style="display:inline-block;margin-left:6px;padding:2px 6px;background-color:#10b981;color:#fff;font-size:10px;font-weight:700;border-radius:4px;letter-spacing:0.4px;">${L.freeLabel}</span>` : ''}</p>
                        ${Number(item.is_free_gift) === 1 && item.bundle_parent_name ? `<p style="margin:3px 0 0;font-size:11px;color:#94a3b8;">${L.freeGiftWith} ${item.bundle_parent_name}</p>` : ''}
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
                .cta-btn { display: block !important; width: 100% !important; padding: 16px 12px !important; font-size: 15px !important; box-sizing: border-box !important; }
            }
        </style>
    </head>
    <body dir="${dirAttr(ar)}" style="margin:0;padding:0;background-color:#f4f7f9;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;text-align:${alignStart(ar)};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f9;padding:40px 0;">
            <tr>
                <td align="center">
                    <!-- Top Card -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;margin-bottom:25px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                            <td align="center" style="padding:30px 0;border-bottom:1px solid #f1f5f9;">
                                <img src="cid:mariotEmailLogo" alt="Mariot" style="height:45px;">
                            </td>
                        </tr>
                        <tr>
                            <td class="content-pad" style="padding:40px 45px;">
                                <h1 style="margin:0 0 25px;font-size:20px;font-weight:600;color:#334155;">${L.heading}</h1>
                                <p style="margin:0 0 20px;font-size:14px;color:#475569;">${L.dear} ${userName},</p>
                                <p style="margin:0 0 15px;font-size:14px;color:#475569;line-height:1.6;">
                                    ${L.body}
                                </p>
                                <p style="margin:0 0 25px;font-size:14px;color:#475569;line-height:1.6;">
                                    ${L.below}
                                </p>
                                <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
                                    ${L.thanks}
                                </p>
                            </td>
                        </tr>
                    </table>

                    <!-- Order Detail Card -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                            <td class="content-pad" style="padding:40px 45px;">
                                <h2 style="margin:0 0 35px;font-size:18px;font-weight:600;color:#64748b;text-align:center;">${L.orderDetail}</h2>

                                <!-- Meta Row -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:35px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:15px 0;">
                                    <tr>
                                        <td style="text-align:${alignStart(ar)};"><span style="font-size:11px;color:#94a3b8;text-transform:uppercase;">${L.orderNo}</span><br><span style="font-size:13px;color:#334155;font-weight:600;">${orderId}</span></td>
                                        <td align="center"><span style="font-size:11px;color:#94a3b8;text-transform:uppercase;">${L.dateL}</span><br><span style="font-size:13px;color:#334155;font-weight:600;">${date}</span></td>
                                        <td style="text-align:${ar ? 'left' : 'right'};"><span style="font-size:11px;color:#94a3b8;text-transform:uppercase;">${L.totalL}</span><br><span style="font-size:13px;color:#334155;font-weight:600;">AED ${total}</span></td>
                                    </tr>
                                </table>

                                <!-- Addresses -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:35px;">
                                    <tr>
                                        <td width="50%" style="vertical-align:top;padding-${ar ? 'left' : 'right'}:20px;">
                                            <h4 style="margin:0 0 12px;font-size:15px;color:#64748b;font-weight:600;">${L.deliveryAddr}</h4>
                                            <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
                                                ${shipping.firstName || userName} ${shipping.lastName || ''}<br>
                                                ${shipping.streetAddress || ''}<br>
                                                ${shipping.city || ''}<br>
                                                ${shipping.phone || ''}
                                            </p>
                                        </td>
                                        <td width="50%" style="vertical-align:top;">
                                            <h4 style="margin:0 0 12px;font-size:15px;color:#64748b;font-weight:600;">${L.billingAddr}</h4>
                                            <p style="margin:0 0 15px;font-size:13px;color:#475569;line-height:1.6;">
                                                ${billing.firstName || userName} ${billing.lastName || ''}<br>
                                                ${billing.streetAddress || ''}<br>
                                                ${billing.city || ''}
                                            </p>
                                            <h4 style="margin:0 0 8px;font-size:15px;color:#64748b;font-weight:600;">${L.paymentL}</h4>
                                            <p style="margin:0;font-size:13px;color:#475569;">
                                                ${orderData.payment_method === 'cod' ? L.cod : orderData.payment_method === 'tabby' ? L.tabby : L.card}
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Shipment Box -->
                                <div style="border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;">
                                    <div style="padding:15px 20px;border-bottom:1px solid #f1f5f9;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="text-align:${alignStart(ar)};">
                                                    <span style="font-size:14px;font-weight:600;color:#334155;">${L.shipmentNo}</span>
                                                    <span style="margin:0 10px;padding:2px 10px;background-color:#fef3c7;color:#92400e;font-size:11px;font-weight:700;border-radius:12px;text-transform:uppercase;vertical-align:middle;">${statusTitle}</span>
                                                </td>
                                                <td style="text-align:${ar ? 'left' : 'right'};">
                                                    <span style="font-size:12px;color:#16A1DB;font-weight:600;">${L.trackingId} ${orderId}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <div style="padding:10px 20px;background-color:#f8fafc;border-bottom:1px solid #f1f5f9;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="font-size:12px;color:#64748b;text-align:${alignStart(ar)};">${L.by} <span style="color:#334155;font-weight:600;">${L.delivery}</span></td>
                                                <td style="font-size:12px;color:#64748b;text-align:${ar ? 'left' : 'right'};">
                                                    ${L.estDelivery} <span style="color:#334155;font-weight:700;">${L.deliveryWord} ${new Date().toLocaleDateString(ar ? 'ar-AE' : 'en-GB')}</span>
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
                    ${emailFooterBlock()}
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: L.subject,
        html,
        attachments: [emailLogoAttachment()].filter(Boolean)
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
const sendAbandonedCartEmail = async (toEmail, userName, cartItems = [], reminderNumber = 1, locale = 'en') => {
    const transporter = createTransporter();
    const SITE = process.env.FRONTEND_URL || 'https://mariotstore.com';
    const ar = isAr(locale);

    const L = ar ? {
        headline1: 'لا تنسَ منتجاتك!',
        headline2: 'نأمل أن تكون لا تزال مهتماً\nبالمنتجات التي تركتها.',
        cta: 'أكمل طلبك الآن',
        oneClick: 'أنت على بُعد نقرة واحدة من أفضل عرض',
        summary: 'الملخص', itemsL: 'المنتجات', shipping: 'رسوم الشحن', free: 'مجاني',
        taxable: 'إجمالي المبلغ الخاضع للضريبة', vatL: 'إجمالي ضريبة القيمة المضافة',
        totalL: 'الإجمالي', vatIncl: '(شامل الضريبة)',
        checkout: 'أكمل الدفع الآن واستمتع بالتوفير مع <strong>ماريوت</strong>',
        estBy: 'التوصيل المتوقع بحلول:',
        subject1: '🛒 لا تنسَ منتجاتك! — متجر ماريوت',
        subject2: '🛒 لا تزال مهتماً؟ أكمل طلبك — متجر ماريوت'
    } : {
        headline1: "Don't forget your items!",
        headline2: "We hope you're still interested in\nthe items you left behind.",
        cta: 'Complete your order now',
        oneClick: 'You are one click away from the best offer',
        summary: 'Summary', itemsL: 'Items', shipping: 'Shipping fees', free: 'Free',
        taxable: 'Total taxable amount', vatL: 'Total VAT amount',
        totalL: 'Total', vatIncl: '(VAT included)',
        checkout: 'Checkout Now and enjoy saving with <strong>Mariot</strong>',
        estBy: 'Estimated delivery by:',
        subject1: `🛒 Don't forget your items! — Mariot Store`,
        subject2: `🛒 Still interested? Complete your order — Mariot Store`
    };

    const headline = reminderNumber === 1 ? L.headline1 : L.headline2;

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
                            <img src="${item.image || 'cid:mariotEmailLogo'}" width="70" height="70" style="border-radius:6px;object-fit:contain;border:1px solid #f1f5f9;background-color:#ffffff;">
                        </a>
                    </td>
                    <td style="padding-inline-start:15px;vertical-align:top;">
                        <a href="${SITE}/product/${item.slug || ''}" style="text-decoration:none;font-size:14px;font-weight:600;color:#334155;line-height:1.4;display:block;margin-bottom:8px;">${item.name}</a>
                        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">${L.estBy} ${new Date(Date.now() + 7 * 86400000).toLocaleDateString(ar ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short' })} - ${new Date(Date.now() + 14 * 86400000).toLocaleDateString(ar ? 'ar-AE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        <p style="margin:6px 0 0;">
                            <span style="display:inline-block;padding:2px 8px;background-color:#f1f5f9;color:#64748b;font-size:11px;font-weight:700;border-radius:4px;">x${item.quantity}</span>
                            <span style="margin:0 10px;font-size:14px;font-weight:700;color:#16A1DB;">AED ${(effectivePrice * item.quantity).toFixed(2)}</span>
                            ${hasDiscount ? `<span style="margin:0 6px;font-size:12px;color:#94a3b8;text-decoration:line-through;">AED ${(originalPrice * item.quantity).toFixed(2)}</span>` : ''}
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
                .cta-btn { display: block !important; width: 100% !important; padding: 16px 12px !important; font-size: 15px !important; box-sizing: border-box !important; }
            }
        </style>
    </head>
    <body dir="${dirAttr(ar)}" style="margin:0;padding:0;background-color:#f4f7f9;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;text-align:${alignStart(ar)};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7f9;padding:40px 0;">
            <tr>
                <td align="center">
                    <!-- Top Card -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;margin-bottom:25px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                            <td align="center" style="padding:30px 0;border-bottom:1px solid #f1f5f9;">
                                <img src="cid:mariotEmailLogo" alt="Mariot" style="height:45px;">
                            </td>
                        </tr>
                        <tr>
                            <td class="content-pad" style="padding:40px 45px;text-align:center;">
                                <h1 style="margin:0 0 30px;font-size:22px;font-weight:600;color:#334155;white-space:pre-line;line-height:1.4;">${headline}</h1>
                                <a href="${SITE}/cart" class="cta-btn" style="display:inline-block;padding:16px 50px;background-color:#16A1DB;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:0.3px;">${L.cta}</a>
                            </td>
                        </tr>
                    </table>

                    <!-- Products Card -->
                    <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                        <tr>
                            <td style="padding:25px 45px 10px;text-align:center;border-bottom:1px solid #e2e8f0;">
                                <p style="margin:0;font-size:13px;color:#f59e0b;font-weight:600;">${L.oneClick}</p>
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
                                    <tr><td colspan="2" style="padding-bottom:12px;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;text-align:${alignStart(ar)};">${L.summary}</td></tr>
                                    <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">${L.itemsL}</td><td style="padding:4px 0;font-size:13px;color:#334155;text-align:${ar ? 'left' : 'right'};">AED ${subtotal.toFixed(2)}</td></tr>
                                    <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">${L.shipping}</td><td style="padding:4px 0;font-size:13px;color:#16a34a;font-weight:600;text-align:${ar ? 'left' : 'right'};">${L.free}</td></tr>
                                    <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">${L.taxable}</td><td style="padding:4px 0;font-size:13px;color:#334155;text-align:${ar ? 'left' : 'right'};">AED ${subtotal.toFixed(2)}</td></tr>
                                    <tr><td style="padding:4px 0;font-size:13px;color:#64748b;">${L.vatL}</td><td style="padding:4px 0;font-size:13px;color:#334155;text-align:${ar ? 'left' : 'right'};">AED ${vat.toFixed(2)}</td></tr>
                                    <tr><td style="padding:15px 0 5px;font-size:15px;font-weight:700;color:#0f172a;">${L.totalL} <span style="font-size:11px;font-weight:400;color:#64748b;">${L.vatIncl}</span></td><td style="padding:15px 0 5px;font-size:18px;font-weight:700;color:#0f172a;text-align:${ar ? 'left' : 'right'};">AED ${total.toFixed(2)}</td></tr>
                                </table>

                                <div style="text-align:center;margin:30px 0 10px;">
                                    <p style="margin:0 0 15px;font-size:14px;color:#475569;">${L.checkout}</p>
                                    <a href="${SITE}/cart" class="cta-btn" style="display:inline-block;padding:16px 50px;background-color:#16A1DB;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;letter-spacing:0.3px;box-sizing:border-box;text-align:center;">${L.cta}</a>
                                </div>
                            </td>
                        </tr>
                    </table>

                    <!-- Footer -->
                    ${emailFooterBlock()}
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;

    const subject = reminderNumber === 1 ? L.subject1 : L.subject2;

    try {
        await transporter.sendMail({ from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`, to: toEmail, subject, html, attachments: [emailLogoAttachment()].filter(Boolean) });
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
    const imageUrl = product.primaryImage || 'cid:mariotEmailLogo';
    const hasDiscount = product.offer_price && Number(product.offer_price) < Number(product.price);
    const displayPrice = hasDiscount ? Number(product.offer_price).toFixed(2) : Number(product.price).toFixed(2);
    const originalPrice = Number(product.price).toFixed(2);

    const badgeColors = {
        'Limited Offer': { bg: '#ef4444', text: '🔥 LIMITED OFFER — Hurry Up!' },
        'Daily Offer': { bg: '#f59e0b', text: '⚡ DAILY OFFER — Today Only!' },
        'Weekly Deal': { bg: '#8b5cf6', text: '🏷️ WEEKLY DEAL — Don\'t Miss It!' },
        'Featured': { bg: '#0ea5e9', text: '⭐ FEATURED PRODUCT' },
        'Best Seller': { bg: '#10b981', text: '🏆 BEST SELLER' },
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
                                <img src="cid:mariotEmailLogo" alt="Mariot" style="height:40px;">
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
                                <a href="${productUrl}" style="display:inline-block;background-color:#16A1DB;color:#ffffff;text-decoration:none;padding:16px 50px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.3px;">
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
                    ${emailFooterBlock()}
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
            html,
            attachments: [emailLogoAttachment()].filter(Boolean)
        });
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send offer notification to ${toEmail}:`, error.message);
        throw error;
    }
};

/**
 * Send a clean invoice notification email with the invoice PDF as attachment
 */
const sendInvoiceEmail = async (toEmail, userName, invoiceNumber, orderId, totalAmount, items = [], givenByName = '', pdfBuffer = null) => {
    const transporter = createTransporter();
    const SITE = process.env.FRONTEND_URL || 'https://mariotstore.com';

    const invoiceDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <style>
        .info-row { border-bottom: 1px dashed #e2e8f0; }
        .info-row:last-child { border-bottom: none; }
    </style>
</head>
<body style="margin:0;padding:0;background:#f4f7f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:40px 0;">
<tr><td align="center">

<table width="600" class="container" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;box-shadow:0 4px 15px rgba(0,0,0,0.05);">

    <!-- Header -->
    <tr>
        <td style="background:#111827;padding:20px 32px;border-bottom:4px solid #16a1db;">
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td style="vertical-align:middle;text-align:left;">
                        <img src="cid:mariotLogoEn" alt="MARIOT" style="height:35px;object-fit:contain;">
                    </td>
                    <td style="vertical-align:middle;text-align:right;">
                        <img src="cid:mariotLogoAr" alt="ماريوت" style="height:35px;object-fit:contain;">
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    <!-- Body -->
    <tr>
        <td class="content-pad" style="padding:40px 32px 30px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                    <td width="70" style="vertical-align:top;">
                        <div style="background:#e0f2fe;width:55px;height:55px;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;">
                            <img src="https://cdn-icons-png.flaticon.com/64/2933/2933116.png" style="width:30px;height:30px;margin-top:12px;">
                        </div>
                    </td>
                    <td style="vertical-align:middle;">
                        <p style="margin:0 0 5px;font-size:16px;font-weight:700;color:#333;">Hello ${userName || 'Customer'},</p>
                        <h1 style="margin:0;font-size:24px;font-weight:800;color:#111;">Your order has been delivered!</h1>
                    </td>
                </tr>
            </table>

            <p style="margin:0 0 5px;font-size:14px;color:#444;line-height:1.6;">
                Thank you for choosing Mariot Kitchen Equipment.
            </p>
            <p style="margin:0 0 25px;font-size:14px;color:#444;line-height:1.6;">
                We're pleased to inform you that your order #${orderId} has been successfully delivered.
            </p>

            <!-- Order summary box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;overflow:hidden;">
                <tr>
                    <td style="padding:15px 20px;border-bottom: 1px dashed #e2e8f0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td width="30"><img src="https://cdn-icons-png.flaticon.com/32/2956/2956485.png" style="width:16px;opacity:0.6;"></td>
                                <td style="font-size:14px;color:#333;font-weight:600;">Invoice Number</td>
                                <td style="font-size:14px;color:#111;font-weight:700;text-align:right;">${invoiceNumber}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:15px 20px;border-bottom: 1px dashed #e2e8f0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td width="30"><img src="https://cdn-icons-png.flaticon.com/32/679/679821.png" style="width:16px;opacity:0.6;"></td>
                                <td style="font-size:14px;color:#333;font-weight:600;">Order Number</td>
                                <td style="font-size:14px;color:#111;font-weight:700;text-align:right;">#${orderId}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:15px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td width="30"><img src="https://cdn-icons-png.flaticon.com/32/2838/2838779.png" style="width:16px;opacity:0.6;"></td>
                                <td style="font-size:14px;color:#333;font-weight:600;">Date</td>
                                <td style="font-size:14px;color:#111;font-weight:700;text-align:right;">${invoiceDate}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td style="padding:15px 20px;background:#f0f9ff;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td width="30">
                                    <div style="background:#16a1db;color:#fff;width:20px;height:20px;border-radius:50%;text-align:center;line-height:20px;font-size:12px;font-weight:bold;">$</div>
                                </td>
                                <td style="font-size:14px;color:#111;font-weight:700;">Total Amount</td>
                                <td style="font-size:18px;color:#16a1db;font-weight:800;text-align:right;">AED ${Number(totalAmount).toFixed(2)}</td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <!-- Blue info box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #eef2f6;border-radius:8px;margin-bottom:24px;">
                <tr>
                    <td style="padding:15px 20px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td width="50" style="vertical-align:middle;">
                                    <div style="background:#e0f2fe;width:35px;height:35px;border-radius:6px;display:flex;align-items:center;justify-content:center;text-align:center;">
                                        <img src="https://cdn-icons-png.flaticon.com/32/2956/2956485.png" style="width:18px;opacity:0.7;margin-top:8px;">
                                    </div>
                                </td>
                                <td style="font-size:13px;color:#444;line-height:1.5;">
                                    Your invoice is attached to this email as <strong>Invoice-${invoiceNumber}.pdf</strong>.<br>
                                    Please download it for your records.
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>

            <p style="margin:0 0 20px;font-size:13px;color:#666;line-height:1.5;">
                If you have any questions regarding your invoice or order,<br>
                please don't hesitate to contact us.
            </p>

            <a href="${SITE}/en/profile?tab=yourOrders" style="display:inline-block;background:#16a1db;color:#ffffff;text-decoration:none;padding:12px 25px;border-radius:6px;font-weight:700;font-size:14px;">
                <img src="https://cdn-icons-png.flaticon.com/32/2926/2926214.png" style="width:16px;vertical-align:middle;margin-right:8px;filter:invert(1);">
                Download Invoice
            </a>
        </td>
    </tr>

    <!-- Footer (shared, responsive) -->
    <tr>
        <td style="padding:0;">${emailFooter()}</td>
    </tr>

</table>

</td></tr>
</table>
</body>
</html>`;

    const path = require('path');
    const invoicePdfAttachment = pdfBuffer ? [{
        filename: `Invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
    }] : [];

    const mailOptions = {
        from: `"Mariot Kitchen Equipment" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject: `Invoice #${invoiceNumber} — Order #${orderId} | Mariot Kitchen Equipment`,
        html,
        attachments: [
            ...invoicePdfAttachment,
            LOGO_EN_PATH ? { filename: 'mariot-logo.png', path: LOGO_EN_PATH, cid: 'mariotLogoEn' } : null,
            LOGO_AR_PATH ? { filename: 'MARIOT-A.png', path: LOGO_AR_PATH, cid: 'mariotLogoAr' } : null
        ].filter(Boolean)
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ Invoice email sent to ${toEmail}${pdfBuffer ? ' (with PDF)' : ''}`);
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send invoice email to ${toEmail}:`, error.message);
        throw error;
    }
};

/**
 * Send an account verification OTP email.
 * @param {string} toEmail - Recipient email
 * @param {string} userName - User's display name (may be blank)
 * @param {string} otp - 6-digit OTP code
 * @param {object} [opts]
 * @param {string} [opts.purpose] - "signup" | "email-change" (controls heading copy)
 */
const sendOtpEmail = async (toEmail, userName, otp, opts = {}) => {
    const purpose = opts.purpose || 'signup';
    const transporter = createTransporter();
    const firstName = (userName || '').split(' ')[0] || '';
    const heading = purpose === 'email-change' ? 'Verify your new email' : 'Account verification';
    const subject = purpose === 'email-change'
        ? `Mariot — Verify your new email (${otp})`
        : `Mariot — Your verification code (${otp})`;
    const digits = String(otp).split('');
    const helpCentreUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/en/contact`;

    const mailOptions = {
        from: `"Mariot Store" <${process.env.SMTP_EMAIL}>`,
        to: toEmail,
        subject,
        text: `Hi${firstName ? ' ' + firstName : ''},\n\nYour Mariot one-time password (OTP) is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, you can safely ignore this email.\n\n— Team Mariot`,
        html: `
            <div style="background-color: #f4f4f4; padding: 40px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div class="container content-pad" style="max-width: 600px; margin: 0 auto; padding: 40px; background-color: #ffffff; color: #000000; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="margin-bottom: 24px;">
                        <img src="https://mariotstore.com/wp-content/uploads/2024/10/kitchen-equipment-store.png" alt="MARIOT" style="width: 180px; height: auto;">
                    </div>

                    <h1 style="font-size: 32px; color: #0f172a; margin: 12px 0 28px; font-weight: 800; line-height: 1.15;">${heading}</h1>

                    <p style="font-size: 15px; color: #0f172a; font-weight: 700; margin: 0 0 8px;">Hi${firstName ? ' ' + firstName : ''},</p>
                    <p style="font-size: 14px; color: #1e293b; margin: 0 0 18px;">Your one time password (OTP) is</p>

                    <div style="background-color: #fef9c3; border-radius: 8px; padding: 22px 16px; margin: 0 0 22px; text-align: center;">
                        <div style="display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: 18px; padding-inline-start: 18px;">${digits.join('')}</div>
                    </div>

                    <p style="font-size: 13px; color: #334155; line-height: 1.6; margin: 0 0 14px;">
                        Please note this is a temporary password and will expire in <strong>5 minutes</strong>. If there's been a mistake, please contact our customer support team at
                        <a href="mailto:admin@mariotkitchen.com" style="color: #16a1db; text-decoration: underline;">admin@mariotkitchen.com</a>.
                    </p>

                    <p style="font-size: 13px; color: #334155; margin: 24px 0 0;">Thank you,</p>
                    <p style="font-size: 13px; color: #0f172a; font-weight: 700; margin: 0;">Team Mariot</p>

                    <div style="margin-top: 32px; padding-top: 18px; border-top: 1px solid #e5e7eb; text-align: center; color: #64748b; font-size: 12px;">
                        Need more help? Visit our <a href="${helpCentreUrl}" style="color: #16a1db; text-decoration: underline;">Help Centre</a>.
                    </div>
                </div>
                ${emailFooterBlock()}
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] ✅ OTP email sent to ${toEmail}`);
    } catch (error) {
        console.error(`[EMAIL] ❌ Failed to send OTP email to ${toEmail}:`, error.message);
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
    sendOfferNotificationEmail,
    sendInvoiceEmail,
    sendOtpEmail
};



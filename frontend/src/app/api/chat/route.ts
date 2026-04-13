import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- Rate Limiting (in-memory, per-IP) ---
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 20;        // max requests per window
const RATE_LIMIT_WINDOW = 60000;  // 1 minute window

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return false;
    }
    entry.count++;
    return entry.count > RATE_LIMIT_MAX;
}

// Clean up stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    Array.from(rateLimitMap.entries()).forEach(([key, value]) => {
        if (now > value.resetTime) rateLimitMap.delete(key);
    });
}, 5 * 60 * 1000);

// --- Input Sanitization ---
const MAX_MESSAGE_LENGTH = 2000;  // max chars per message
const MAX_MESSAGES = 50;          // max messages in conversation history

function sanitizeText(text: string): string {
    return text
        .replace(/<[^>]*>/g, '')    // Strip HTML tags
        .replace(/&[#\w]+;/g, '')   // Strip HTML entities
        .trim();
}

function validateMessages(messages: any): { valid: boolean; error?: string } {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return { valid: false, error: 'Messages array is required and must not be empty' };
    }

    if (messages.length > MAX_MESSAGES) {
        return { valid: false, error: `Too many messages (max ${MAX_MESSAGES})` };
    }

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (!msg || typeof msg.content !== 'string' || typeof msg.role !== 'string') {
            return { valid: false, error: `Invalid message format at index ${i}` };
        }
        if (!['user', 'assistant'].includes(msg.role)) {
            return { valid: false, error: `Invalid role "${msg.role}" at index ${i}` };
        }
        if (msg.content.length > MAX_MESSAGE_LENGTH) {
            return { valid: false, error: `Message at index ${i} exceeds max length of ${MAX_MESSAGE_LENGTH} characters` };
        }
    }

    return { valid: true };
}

const SYSTEM_PROMPT_EN = `You are the Mariot Kitchen Expert — the official AI assistant for Mariot Kitchen Equipment, the #1 commercial kitchen equipment supplier in the UAE.

PERSONALITY:
- Professional, warm, and highly knowledgeable.
- Speak like a trusted consultant helping a business grow, not a pushy salesperson.
- Be concise — keep responses under 3-4 sentences unless the user specifically asks for technical details.
- Use bullet points for specifications or short lists.

KNOWLEDGE (Business Info):
- Products: Premium commercial kitchen equipment including Ovens (Combi, Pizza, Bakery), Refrigeration, Dishwashers, Ice Cream Machines, Food Preparation (Mixers, Slicers), Vacuum Sealers, Stainless Steel Fabrication, and Coffee/Beverage equipment.
- Locations (UAE Branches):
  - Dubai: Deira (Main)
  - Abu Dhabi: Muroor Road
  - Sharjah: Al Majaz and Industrial Area
  - Al Ain: Industrial Area
- Contact: Phone/WhatsApp +971 4 288 2777 | Email: info@mariot-group.com
- Website: mariotstore.com
- Shipping: Free shipping on orders over AED 1,500 across the UAE. Standard delivery is 4-7 working days.
- VAT: 5% UAE VAT is included in listed prices.
- Payments: Credit/Debit Cards (Stripe), Bank Transfer, and Tabby (Split in 4 interest-free payments).
- Target Audience: Restaurants, hotels, cafes, bakeries, and catering businesses across the UAE and GCC.

BEHAVIOR:
- If asked about a product, provide helpful highlights and suggest browsing the store or contacting sales for a formal quote.
- If the user is ready to buy or needs a specific bulk quote, direct them to the "Request a Quote" feature or the WhatsApp link.
- If you don't know a specific detail (like exact current stock for a specific SKU), be honest and offer to connect them with a human expert via WhatsApp.
- Never make up prices or technical specs that aren't provided.
- Always be helpful regarding shipping, returns (14-day policy), and payment options.

IMPORTANT: You are in a small chat widget. Keep responses SHORT, scannable, and clean. Use emojis sparingly (✅, 📦, 🔧). Use bold text for key terms.`;

const SYSTEM_PROMPT_AR = `أنت خبير مطابخ ماريوت — المساعد الذكي الرسمي لشركة ماريوت لمعدات المطابخ، المورد الأول لمعدات المطابخ التجارية في الإمارات.

الشخصية:
- محترف، ودود، وذو معرفة واسعة جداً.
- تحدث كمستشار موثوق يساعد الشركات على النمو، وليس كبائع صريح.
- كن مختصراً — اجعل الردود في حدود 3-4 جمل ما لم يطلب المستخدم تفاصيل تقنية أطول.
- استخدم النقاط للمواصفات أو القوائم القصيرة.

المعرفة (معلومات الشركة):
- المنتجات: معدات مطابخ تجارية فاخرة تشمل الأفران (كومبي، بيتزا، مخابز)، التبريد، غسالات الأطباق، ماكينات الآيس كريم، تحضير الطعام (عجانات، قطاعات)، أجهزة تغليف الأطعمة، تصنيع الستانلس ستيل، ومعدات القهوة والمشروبات.
- الفروع (في الإمارات):
  - دبي: ديرة (الفرع الرئيسي)
  - أبوظبي: شارع المرور
  - الشارقة: المجاز والمنطقة الصناعية
  - العين: المنطقة الصناعية
- التواصل: هاتف/واتساب 2777 288 4 971+ | البريد الإلكتروني: info@mariot-group.com
- الموقع الإلكتروني: mariotstore.com
- الشحن: شحن مجاني للطلبات فوق 1,500 درهم داخل الإمارات. التوصيل القياسي خلال 4-7 أيام عمل.
- الضريبة: ضريبة القيمة المضافة 5% مشمولة في الأسعار المعلنة.
- الدفع: بطاقات الائتمان (Stripe)، التحويل البنكي، وخدمة "تابي" (تقسيط على 4 دفعات بدون فوائد).
- الجمهور المستهدف: المطاعم، الفنادق، المقاهي، المخابز، وشركات التموين في الإمارات ودول الخليج.

السلوك:
- إذا سُئلت عن منتج، قدم أبرز المميزات واقترح تصفح المتجر أو التواصل مع المبيعات للحصول على عرض سعر رسمي.
- إذا كان المستخدم جاهزاً للشراء أو يحتاج عرض سعر لطلبية كبيرة، وجهه لميزة "طلب عرض أسعار" أو رابط الواتساب.
- إذا لم تعرف تفاصيل دقيقة (مثل توفر المخزون اللحظي لمنتج معين)، كن صادقاً واعرض ربطهم بخبير بشري عبر الواتساب.
- لا تختلق أسعاراً أو مواصفات تقنية غير متوفرة.
- كن دائماً مفيداً بشأن الشحن، الإرجاع (سياسة 14 يوماً)، وخيارات الدفع.

مهم: أنت تتحدث عبر نافذة دردشة صغيرة. اجعل الردود قصيرة، سهلة القراءة، ومنظمة. استخدم الرموز التعبيرية باعتدال (✅، 📦، 🔧). استخدم النص العريض للكلمات الرئيسية.`;

export async function POST(request: NextRequest) {
    try {
        // Rate limiting by IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait a moment and try again.' },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { messages, locale } = body;

        // Validate messages
        const validation = validateMessages(messages);
        if (!validation.valid) {
            return NextResponse.json(
                { error: validation.error },
                { status: 400 }
            );
        }

        // Validate locale
        const safeLocale = ['en', 'ar'].includes(locale) ? locale : 'en';

        // Sanitize all message content
        const sanitizedMessages = messages.map((msg: { role: string; content: string }) => ({
            role: msg.role,
            content: sanitizeText(msg.content),
        }));

        const systemPrompt = safeLocale === 'ar' ? SYSTEM_PROMPT_AR : SYSTEM_PROMPT_EN;

        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            systemInstruction: systemPrompt,
        });

        // Build conversation history for Gemini
        const history = sanitizedMessages.slice(0, -1).map((msg: { role: string; content: string }) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({ history });

        const lastMessage = sanitizedMessages[sanitizedMessages.length - 1].content;
        const result = await chat.sendMessage(lastMessage);
        const response = result.response;
        const text = response.text();

        return NextResponse.json({ message: text });
    } catch (error: any) {
        console.error('Chat API Error:', error?.message || error);
        // Don't leak internal error details to client
        return NextResponse.json(
            { error: 'Failed to generate response. Please try again.' },
            { status: 500 }
        );
    }
}

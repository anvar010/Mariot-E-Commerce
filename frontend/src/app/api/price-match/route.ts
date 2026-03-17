import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const shopName = formData.get('shopName') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const productName = formData.get('productName') as string;
        const productUrl = formData.get('productUrl') as string;
        const file = formData.get('file') as File | null;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'mariotkitchen@gmail.com',
                pass: 'kycv sccr zqcu mnsr'
            }
        });

        let attachments = [];
        if (file) {
            const buffer = Buffer.from(await file.arrayBuffer());
            attachments.push({
                filename: file.name,
                content: buffer
            });
        }

        const mailOptions = {
            from: 'mariotkitchen@gmail.com',
            to: 'anvarshaknavas588@gmail.com',
            subject: `New Price Match Request: ${productName}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #4ab1b5;">New Price Match Request</h2>
                    <p style="font-size: 16px;">A customer has requested a price match for the following product:</p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <p><strong>Product:</strong> ${productName}</p>
                        <p><strong>Product URL:</strong> <a href="${productUrl}">${productUrl}</a></p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
                        <p><strong>Competitor Shop/URL:</strong> ${shopName}</p>
                        <p><strong>Customer Email:</strong> ${email}</p>
                        <p><strong>Customer Phone:</strong> +971 ${phone}</p>
                    </div>
                    
                    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">This request was submitted via the Price Match form on the product detail page.</p>
                </div>
            `,
            attachments
        };

        await transporter.sendMail(mailOptions);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Email Error:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to send price match request'
        }, { status: 500 });
    }
}

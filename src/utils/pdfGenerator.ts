import { BASE_URL } from '@/config';

export interface InvoicePDFData {
    invoice_number: string;
    order_id: number;
    customer_name: string;
    given_by_name?: string;
    final_amount: number;
    items: any[];
}
// Dynamically imported when generated to fix next.js SSR build errors

// Helper to resolve image URLs inside the PDF generator
const resolveImageUrl = (url?: string) => {
    if (!url) return '/assets/placeholder-image.webp';
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/assets/')) return url;

    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Convert an image URL to a base64 data URI using a server-side proxy
const imageToBase64 = async (url: string): Promise<string> => {
    try {
        // Provide current window origin so API handles relative URLs flawlessly
        const fullUrl = url.startsWith('http') ? url : new URL(url, window.location.origin).toString();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(fullUrl)}`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`imageToBase64: proxy failed with ${response.status} for ${url}`);
            return '/assets/placeholder-image.webp';
        }

        const data = await response.json();
        if (data.success && data.base64) {
            return data.base64;
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('imageToBase64 timed out for URL:', url);
        } else {
            console.error('imageToBase64 fell back to placeholder due to error:', error, 'for URL:', url);
        }
    }

    return '/assets/placeholder-image.webp';
};

export const generateQuotationPDF = async (quotation: any, shouldDownload = false) => {
    const items = typeof quotation.items === 'string' ? JSON.parse(quotation.items) : (quotation.items || []);

    const formatDate = (dateStr: any) => {
        return new Date(dateStr || new Date()).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Pre-convert all images to base64 to avoid CORS issues in html2canvas
    const logoBase64 = await imageToBase64(window.location.origin + '/assets/mariot-logo.webp');
    const itemImageBase64s = await Promise.all(
        items.map((item: any) => imageToBase64(resolveImageUrl(item.image)))
    );

    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();

    // Helper to generate a single page HTML
    const getPageHTML = (itemChunk: any[], chunkStartIndex: number, isFirstPage: boolean, isLastPage: boolean) => {
        return `
            <div style="width: 794px; min-height: 1122px; background: white; padding: 40px; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155; line-height: 1.5; box-sizing: border-box; display: flex; flex-direction: column;">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                         <div style="width: 12px; height: 12px; background: #334155;"></div>
                         <span style="font-size: 24px; font-weight: bold; color: #334155;">Quotation</span>
                    </div>
                    <img src="${logoBase64}" alt="Logo" style="height: 50px;">
                    <div style="display: flex; align-items: center; gap: 8px; direction: rtl;">
                         <div style="width: 12px; height: 12px; background: #334155;"></div>
                         <span style="font-size: 24px; font-weight: bold; color: #334155;">تسعيرة</span>
                    </div>
                </div>

                ${isFirstPage ? `
                    <!-- Ref & Date -->
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="display: flex; justify-content: center; gap: 40px; font-size: 14px;">
                            <div style="text-align: left;">
                                <div style="color: #64748b; margin-bottom: 4px;">Quotation Ref.</div>
                                <div style="font-weight: bold; font-size: 16px;">${quotation.quotation_ref || 'N/A'}</div>
                            </div>
                            <div style="text-align: right; direction: rtl;">
                                <div style="color: #64748b; margin-bottom: 4px;">مرجع التسعيرة</div>
                                <div style="font-weight: bold; font-size: 16px;">${quotation.quotation_ref || 'N/A'}</div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: center; gap: 40px; font-size: 14px; margin-top: 10px;">
                            <div style="text-align: left;">
                                <div style="color: #64748b; margin-bottom: 4px;">Quotation Issue Date</div>
                                <div style="font-weight: bold; font-size: 16px;">${formatDate(quotation.created_at)}</div>
                            </div>
                            <div style="text-align: right; direction: rtl;">
                                <div style="color: #64748b; margin-bottom: 4px;">تاريخ اصدار التسعيرة</div>
                                <div style="font-weight: bold; font-size: 16px;">${formatDate(quotation.created_at)}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Issued From / To -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px;">
                        <div style="padding: 15px; border-right: 1px solid #e2e8f0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span style="font-size: 12px; color: #64748b;">Issued from</span>
                                <span style="font-size: 12px; color: #64748b; direction: rtl;">أصدرت من</span>
                            </div>
                            <div style="font-weight: bold; font-size: 15px; margin-bottom: 4px;">MARIOT.com</div>
                            <div style="font-size: 13px; color: #334155;">Mariot Kitchen Equipment Trading LLC</div>
                            <div style="background: #f1f5f9; padding: 4px 10px; border-radius: 20px; display: inline-block; margin-top: 10px; font-size: 12px;">
                                VAT# 100412345600003 <span style="margin-left: 10px; direction: rtl;">الرقم الضريبي</span>
                            </div>
                        </div>
                        <div style="padding: 15px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                <span style="font-size: 12px; color: #64748b;">Issued to</span>
                                <span style="font-size: 12px; color: #64748b; direction: rtl;">أصدرت إلى</span>
                            </div>
                            <div style="font-weight: bold; font-size: 15px; margin-bottom: 4px;">${quotation.customer_name || 'Valued Customer'}</div>
                            <div style="font-size: 13px; color: #334155;">${quotation.customer_phone || ''}</div>
                            <div style="font-size: 13px; color: #334155;">${quotation.customer_email || ''}</div>
                        </div>
                    </div>

                    <!-- Note Box -->
                    <div style="display: flex; align-items: center; gap: 15px; padding: 12px 20px; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 30px;">
                         <div style="width: 24px; height: 24px; min-width: 24px; border: 2px solid #334155; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">i</div>
                         <div style="flex: 1; font-size: 12px; color: #334155;">
                            This quotation won't reserve the available stock for you until you place an order
                         </div>
                         <div style="flex: 1; font-size: 12px; color: #334155; text-align: right; direction: rtl;">
                            لن يتم حجز المنتجات في هذه التسعيرة الا بعد إتمام الطلب
                         </div>
                    </div>
                ` : `
                    <div style="margin-bottom: 20px; font-size: 14px; color: #64748b;">
                        Quotation Ref: ${quotation.quotation_ref || 'N/A'} (Continued)
                    </div>
                `}

                <!-- Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; flex-grow: 1;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e2e8f0; background: #f8fafc;">
                            <th style="padding: 10px; text-align: left;">
                                <div style="font-size: 10px; color: #64748b;">Product Ref.</div>
                                <div style="font-size: 10px;">مرجع المنتج</div>
                            </th>
                            <th style="padding: 10px; text-align: left; width: 35%;">
                                <div style="font-size: 10px; color: #64748b;">Product Name.</div>
                                <div style="font-size: 10px;">اسم المنتج</div>
                            </th>
                            <th style="padding: 10px; text-align: center;">
                                <div style="font-size: 10px; color: #64748b;">Product Image</div>
                                <div style="font-size: 10px;">صورة المنتج</div>
                            </th>
                            <th style="padding: 10px; text-align: center;">
                                <div style="font-size: 10px; color: #64748b;">QTY</div>
                                <div style="font-size: 10px;">الكميه</div>
                            </th>
                            <th style="padding: 10px; text-align: right;">
                                <div style="font-size: 10px; color: #64748b;">Unit Price</div>
                                <div style="font-size: 10px;">سعر الوحده</div>
                            </th>
                            <th style="padding: 10px; text-align: right;">
                                <div style="font-size: 10px; color: #64748b;">Total Price</div>
                                <div style="font-size: 10px;">مجموع السعر</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemChunk.map((item: any, idx: number) => `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 15px 10px; font-size: 11px;">#${item.id || 'N/A'}</td>
                                <td style="padding: 15px 10px; font-size: 11px;">
                                    <div style="font-weight: bold; color: #1e293b;">${item.name}</div>
                                    <div style="color: #64748b; font-size: 10px;">Brand: ${item.brand || 'Standard'}</div>
                                </td>
                                <td style="padding: 15px 10px; text-align: center;">
                                    <img src="${itemImageBase64s[chunkStartIndex + idx]}" style="height: 50px; width: 50px; object-fit: contain;">
                                </td>
                                <td style="padding: 15px 10px; text-align: center; font-size: 12px;">${item.quantity}</td>
                                <td style="padding: 15px 10px; text-align: right; font-size: 12px;">${Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td style="padding: 15px 10px; text-align: right; font-size: 12px; font-weight: bold;">${(Number(item.price) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                ${isLastPage ? `
                    <!-- Totals -->
                    <div style="margin-top: auto; margin-bottom: 40px; background: #fafafa; padding: 20px; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
                            <span style="font-size: 13px; font-weight: bold; color: #64748b;">Total Amounts</span>
                            <span style="font-size: 13px; font-weight: bold; color: #64748b; direction: rtl;">إجمالي المبلغ</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                <span style="width: 180px;">Subtotal (Excl. VAT)</span>
                                <span style="font-weight: bold;">AED ${Number(quotation.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span style="width: 180px; text-align: right; direction: rtl;">الإجمالي (غير شامل الضريبة)</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                <span style="width: 180px;">Total VAT (5%)</span>
                                <span style="font-weight: bold;">AED ${Number(quotation.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span style="width: 180px; text-align: right; direction: rtl;">إجمالي الضريبة (5٪)</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 16px; margin-top: 10px; padding-top: 10px; border-top: 2px solid #e2e8f0; color: #334155;">
                                <span style="width: 180px;"><strong>Grand Total</strong></span>
                                <span style="font-weight: 800; font-size: 20px; color: #334155;">AED ${Number(quotation.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span style="width: 180px; text-align: right; direction: rtl;"><strong>إجمالي المبلغ المستحق</strong></span>
                            </div>
                        </div>
                    </div>

                    <!-- Footer / Terms -->
                    <div style="display: flex; flex-direction: column; gap: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                            <div style="font-size: 10px; color: #64748b;">
                                <div style="font-weight: bold; color: #334155; margin-bottom: 5px;">Terms & Conditions</div>
                                <div style="margin-bottom: 3px;">1. Prices are valid for 7 days only from issue date.</div>
                                <div style="margin-bottom: 3px;">2. This is a computer generated quotation, signature not required.</div>
                                <div style="margin-bottom: 3px;">3. Stock availability is subject to change at time of order.</div>
                            </div>
                            <div style="font-size: 10px; color: #64748b; text-align: right; direction: rtl;">
                                <div style="font-weight: bold; color: #334155; margin-bottom: 5px;">الشروط والأحكام</div>
                                <div style="margin-bottom: 3px;">١. الأسعار صالحة لمدة ٧ أيام فقط من تاريخ الإصدار.</div>
                                <div style="margin-bottom: 3px;">٢. هذه تسعيرة معدة بواسطة الكمبيوتر ولا تتطلب توقيع.</div>
                                <div style="margin-bottom: 3px;">٣. توفر المخزون عرضة للتغيير عند تأكيد الطلب.</div>
                            </div>
                        </div>
                        <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; font-weight: bold; color: #334155;">
                            THANK YOU FOR CHOOSING MARIOT
                        </div>
                    </div>
                ` : `
                    <div style="margin-top: auto; text-align: center; font-size: 10px; color: #64748b; padding-top: 20px;">
                        Continued on next page...
                    </div>
                `}
            </div>
        `;
    };

    // Split items into chunks
    const chunks: any[][] = [];
    const ITEMS_PAGE_1 = 6;
    const ITEMS_PAGE_REST = 12;

    if (items.length <= ITEMS_PAGE_1) {
        chunks.push(items);
    } else {
        chunks.push(items.slice(0, ITEMS_PAGE_1));
        let remaining = items.slice(ITEMS_PAGE_1);
        while (remaining.length > 0) {
            chunks.push(remaining.slice(0, ITEMS_PAGE_REST));
            remaining = remaining.slice(ITEMS_PAGE_REST);
        }
    }

    // Process each chunk
    try {
        for (let i = 0; i < chunks.length; i++) {
            const isFirst = i === 0;
            const isLast = i === chunks.length - 1;
            const startIndex = isFirst ? 0 : ITEMS_PAGE_1 + (i - 1) * ITEMS_PAGE_REST;

            const pageContainer = document.createElement('div');
            pageContainer.style.position = 'absolute';
            pageContainer.style.top = '-10000px';
            pageContainer.style.left = '0';
            pageContainer.innerHTML = getPageHTML(chunks[i], startIndex, isFirst, isLast);
            document.body.appendChild(pageContainer);

            await new Promise(r => setTimeout(r, 300));

            const canvas = await html2canvas(pageContainer, {
                scale: 2,
                useCORS: false,
                allowTaint: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: 794,
                windowWidth: 794
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

            document.body.removeChild(pageContainer);
        }

        if (shouldDownload) {
            pdf.save(`${quotation.quotation_ref || 'Quotation'}.pdf`);
        } else {
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        }
    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    }
};

// Brand logo paths that match the physical Mariot invoice header
const INVOICE_BRAND_LOGOS = [
    '/assets/brands/brema.jpg.webp',
    '/assets/brands/rational.jpg.webp',
    '/assets/brands/fimar.jpg.webp',
    '/assets/brands/IMPERIAL.png.webp',
    '/assets/brands/ggf-logo.jpg.webp',
    '/assets/brands/pitco.jpg.webp',
    '/assets/brands/Omega.png.webp',
    '/assets/brands/redfox.jpg.webp',
    '/assets/brands/santos.jpg.webp',
    '/assets/brands/tecnodom.jpg.webp',
    '/assets/brands/star.jpg.webp',
    '/assets/brands/FRYMASTER.png.webp',
    '/assets/brands/menumaster.jpg.webp',
    '/assets/brands/FagorProfesional.png.webp',
    '/assets/brands/unox.jpg.webp',
    '/assets/brands/venix.jpg.webp',
    '/assets/brands/hoonved.jpg.webp',
    '/assets/brands/samixir.jpg.webp',
    '/assets/brands/desmon.png.webp',
];

/**
 * Generate a Mariot-branded invoice PDF matching the physical invoice design exactly.
 * Returns a data URI string: "data:application/pdf;base64,..."
 */
export const generateInvoicePDF = async (data: InvoicePDFData): Promise<string> => {
    const invoiceDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const subtotalExVat = Number(data.final_amount) / 1.05;
    const vatAmount = Number(data.final_amount) - subtotalExVat;

    // Fetch logo + brand images in parallel
    const [mariotLogoEnB64, mariotLogoArB64, faviconB64, isoB64, icvB64, qaB64, ...brandLogosB64] = await Promise.all([
        imageToBase64(window.location.origin + '/assets/mariot-logo2.webp'),   // English logo — left
        imageToBase64(window.location.origin + '/MARIOT-A.webp'),              // Arabic logo  — right
        imageToBase64(window.location.origin + '/favicon.ico'),                // Icon          — centre
        imageToBase64(window.location.origin + '/ISO.webp'),
        imageToBase64(window.location.origin + '/ICV.webp'),
        imageToBase64(window.location.origin + '/Quality-Assurance.webp'),
        ...INVOICE_BRAND_LOGOS.map(p => imageToBase64(window.location.origin + p))
    ]);


    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();

    // Split items into chunks for pagination
    const ITEMS_PER_PAGE = 18;
    let allItems = data.items && data.items.length > 0 ? data.items : [];

    // Chunking the array
    const chunks = [];
    for (let i = 0; i < allItems.length; i += ITEMS_PER_PAGE) {
        chunks.push(allItems.slice(i, i + ITEMS_PER_PAGE));
    }
    if (chunks.length === 0) chunks.push([]);

    // We process each page sequentially
    for (let pageIndex = 0; pageIndex < chunks.length; pageIndex++) {
        const isLastPage = pageIndex === chunks.length - 1;
        const pageItems = [...chunks[pageIndex]];

        // Pad strictly for aesthetic length on physical invoice form.
        // We only pad if it's the ONLY page, to ensure a single page matches the old physical form height exactly.
        const MIN_ROWS = 13;
        if (chunks.length === 1) {
            while (pageItems.length < MIN_ROWS) pageItems.push(null);
        }

        const itemRowsHTML = pageItems.map((item, idx) => {
            const isLastRow = idx === pageItems.length - 1;
            const btmBorder = isLastRow ? 'none' : '1px dotted #1565c0';

            if (!item) return `
            <tr style="height:27px;">
                <td style="border-right:1px solid #1565c0;border-bottom:${btmBorder};"></td>
                <td style="border-right:1px solid #1565c0;border-bottom:${btmBorder};"></td>
                <td style="border-right:1px solid #1565c0;border-bottom:${btmBorder};"></td>
                <td style="border-right:1px solid #1565c0;border-bottom:${btmBorder};"></td>
                <td style="border-bottom:${btmBorder};"></td>
            </tr>`;

            const unitPrice = Number(item.price_at_purchase || item.price || 0);
            const lineTotal = unitPrice * (item.quantity || 1);
            return `
            <tr style="height:27px; color:#111;">
                <td style="border-right:1px solid #1565c0;border-bottom:${btmBorder};font-size:12px;font-weight:700;text-align:center;">${(pageIndex * ITEMS_PER_PAGE) + idx + 1}</td>
                <td style="border-right:1px solid #1565c0;border-bottom:${btmBorder};padding:0 10px;font-size:12px;font-weight:700;">${item.name || ''}</td>
                <td style="border-right:1px solid #1565c0;border-bottom:${btmBorder};font-size:12px;font-weight:700;text-align:center;">${item.quantity || 1}</td>
                <td style="border-right:1px solid #1565c0;border-bottom:${btmBorder};padding:0 10px;font-size:12px;font-weight:700;text-align:center;">${unitPrice.toFixed(2)}</td>
                <td style="border-bottom:${btmBorder};padding:0 10px;font-size:13px;font-weight:800;text-align:center;">${lineTotal.toFixed(2)}</td>
            </tr>`;
        }).join('');

        // Two rows of brand logos matching the physical invoice
        const brandRow1 = brandLogosB64.slice(0, 10).map(b64 => `<img src="${b64}" style="height:18px;max-width:52px;object-fit:contain;">`).join('');
        const brandRow2 = brandLogosB64.slice(10).map(b64 => `<img src="${b64}" style="height:18px;max-width:52px;object-fit:contain;">`).join('');

        const pageHtml = `
        <div style="width:794px;min-height:1123px;background:#fff;padding:24px 28px 16px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;box-sizing:border-box;display:flex;flex-direction:column;position:relative;">
            
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:0;opacity:0.04;pointer-events:none;">
                <img src="${faviconB64}" style="width:560px;height:auto;">
            </div>

            <div style="position:relative;z-index:1;display:flex;flex-direction:column;flex-grow:1;">
                <!-- Header -->
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <div style="flex:1;text-align:left;"><img src="${mariotLogoEnB64}" style="height:72px;object-fit:contain;max-width:260px;"></div>
                    <div style="flex:0 0 auto;margin:0 20px;text-align:center;"><img src="${faviconB64}" style="height:70px;width:70px;object-fit:contain;"></div>
                    <div style="flex:1;text-align:right;"><img src="${mariotLogoArB64}" style="height:72px;object-fit:contain;max-width:260px;float:right;"></div>
                </div>

                <div style="margin-bottom:2px;">
                    <div style="display:flex;flex-wrap:nowrap;gap:6px;align-items:center;justify-content:flex-start;padding:3px 0;">${brandRow1}</div>
                    <div style="display:flex;flex-wrap:nowrap;gap:6px;align-items:center;justify-content:flex-start;padding:3px 0;">${brandRow2}</div>
                </div>

                <div style="border-top:1px solid #ccc;margin-bottom:8px;"></div>
                <div style="text-align:center;margin-bottom:10px;">
                    <div style="font-size:22px;font-weight:bold;color:#111;border-bottom:1px solid #111;display:inline-block;padding-bottom:2px;margin-bottom:3px;min-width:120px;">فاتورة</div>
                    <div style="font-size:19px;font-weight:900;color:#111;letter-spacing:2px;">INVOICE ${chunks.length > 1 ? `(Page ${pageIndex + 1})` : ''}</div>
                </div>

                <div style="font-size:19px;font-weight:900;color:#e91e63;font-style:italic;margin-bottom:10px;">NO: ${data.invoice_number}</div>

                <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
                    <div style="display:flex;align-items:flex-end;gap:0;font-size:15px;font-weight:bold;color:#111;width:55%;">
                        <span style="white-space:nowrap;">Date</span>
                        <span style="flex:1;border-bottom:2px dotted #333;margin:0 8px 3px;text-align:center;font-size:13px;">${invoiceDate}</span>
                        <span style="white-space:nowrap;font-size:16px;direction:rtl;">تاريخ</span>
                    </div>
                </div>
                <div style="display:flex;align-items:flex-end;margin-bottom:8px;font-size:14px;font-weight:bold;color:#111;">
                    <span style="white-space:nowrap;">Mr./M/s.</span>
                    <span style="flex:1;border-bottom:2px dotted #333;margin:0 8px 3px;text-align:center;font-size:13px;">${data.customer_name || ''}</span>
                    <span style="white-space:nowrap;font-size:15px;direction:rtl;">.السيد / م / ث</span>
                </div>
                <div style="display:flex;align-items:flex-end;margin-bottom:18px;font-size:14px;font-weight:bold;color:#111;">
                    <span style="white-space:nowrap;">Customer TRN:</span>
                    <span style="flex:1;border-bottom:2px dotted #333;margin-left:8px;margin-bottom:3px;"></span>
                </div>

                <div style="border:2px solid #1565c0;border-radius:14px;padding:3px;margin-bottom:18px;">
                    <div style="border:1px solid #1565c0;border-radius:11px;overflow:hidden;">
                        <table style="width:100%;border-collapse:collapse;background:transparent;">
                            <thead>
                                <tr style="background:transparent;">
                                    <th style="border-right:1px solid #1565c0;border-bottom:1px solid #1565c0;padding:0;text-align:center;width:60px;vertical-align:middle;">
                                        <div style="padding:8px 4px;"><div style="font-size:13px;font-weight:900;color:#111;">الرقم</div><div style="font-size:11px;font-weight:900;color:#111;">S.No</div></div>
                                    </th>
                                    <th style="border-right:1px solid #1565c0;border-bottom:1px solid #1565c0;padding:0;text-align:center;vertical-align:middle;">
                                        <div style="padding:8px 4px;"><div style="font-size:13px;font-weight:900;color:#111;">التفاصيل</div><div style="font-size:11px;font-weight:900;color:#111;">DESCRIPTION</div></div>
                                    </th>
                                    <th style="border-right:1px solid #1565c0;border-bottom:1px solid #1565c0;padding:0;text-align:center;width:68px;vertical-align:middle;">
                                        <div style="padding:8px 4px;"><div style="font-size:13px;font-weight:900;color:#111;">كمية</div><div style="font-size:11px;font-weight:900;color:#111;">QTY.</div></div>
                                    </th>
                                    <th style="border-right:1px solid #1565c0;border-bottom:1px solid #1565c0;padding:0;text-align:center;width:125px;vertical-align:top;">
                                        <div style="border-bottom:1px solid #1565c0;padding:6px 4px;"><div style="font-size:13px;font-weight:900;color:#111;">سعر الوحدة</div><div style="font-size:10px;font-weight:900;color:#111;">UNIT PRICE</div></div>
                                        <div style="padding:5px 4px;font-size:12px;font-weight:900;color:#111;">Dollar دولار</div>
                                    </th>
                                    <th style="border-bottom:1px solid #1565c0;padding:0;text-align:center;width:125px;vertical-align:top;">
                                        <div style="border-bottom:1px solid #1565c0;padding:6px 4px;"><div style="font-size:13px;font-weight:900;color:#111;">كمية</div><div style="font-size:10px;font-weight:900;color:#111;">AMOUNT</div></div>
                                        <div style="padding:5px 4px;font-size:12px;font-weight:900;color:#111;">Dollar دولار</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemRowsHTML}
                            </tbody>
                            ${isLastPage ? `
                            <tfoot>
                                <tr>
                                    <td colspan="3" style="border-top:1px solid #1565c0;border-right:1px solid #1565c0;padding:10px 14px;">
                                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:bold;color:#111;">
                                            <span>Total Dollar</span><span style="flex:1;border-bottom:1px dotted #555;margin:0 10px;"></span><span style="direction:rtl;font-size:13px;">إجمالي دولار</span>
                                        </div>
                                    </td>
                                    <td style="border-top:1px solid #1565c0;border-right:1px solid #1565c0;padding:8px 4px;text-align:center;vertical-align:middle;">
                                        <div style="font-size:12px;font-weight:900;color:#111;">المجموع</div><div style="font-size:11px;font-weight:900;color:#111;">TOTAL</div>
                                    </td>
                                    <td style="border-top:1px solid #1565c0;padding:8px 10px;font-size:16px;font-weight:800;text-align:center;color:#111;">${Number(data.final_amount).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="border-top:1px solid #1565c0;border-right:1px solid #1565c0;padding:10px 14px;"></td>
                                    <td style="border-top:1px solid #1565c0;border-right:1px solid #1565c0;padding:8px 4px;text-align:center;vertical-align:middle;">
                                        <div style="font-size:12px;font-weight:900;color:#111;">المجموع الإجمالي</div><div style="font-size:11px;font-weight:900;color:#111;">GRAND TOTAL</div>
                                    </td>
                                    <td style="border-top:1px solid #1565c0;padding:8px 10px;font-size:18px;font-weight:900;text-align:center;color:#111;">${Number(data.final_amount).toFixed(2)}</td>
                                </tr>
                            </tfoot>` : ``}
                        </table>
                    </div>
                </div>

                ${isLastPage ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px 30px;font-size:13px;font-weight:700;color:#333;">
                    <span>Sale sign :</span><span>توقيع البائع :</span><span>Received By :</span><span style="direction:rtl;">تم الاستلام بواسطة :</span>
                </div>` : ``}
            </div>

            <!-- Footer -->
            <div style="border-top:1.5px solid #999;padding-top:8px;margin-top:auto;position:relative;z-index:2;">
                <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
                    <tbody><tr style="vertical-align:top;">
                        <td style="width:170px;padding-right:10px;">
                            <div style="display:flex;align-items:center;gap:5px;margin-bottom:7px;">
                                <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://mariotstore.com" style="width:40px;height:40px;border:1px solid #ccc;padding:2px;border-radius:3px;">
                                    <span style="font-size:7px;font-weight:bold;margin-top:2px;color:#111;">SCAN ME</span>
                                </div>
                                <img src="${isoB64}" style="height:38px;max-width:42px;object-fit:contain;" alt="ISO">
                                <img src="${icvB64}" style="height:34px;max-width:42px;object-fit:contain;" alt="ICV">
                                <img src="${qaB64}" style="height:30px;max-width:38px;object-fit:contain;" alt="QA">
                            </div>
                            <div style="font-size:9px;color:#333;line-height:1.55;font-weight:600;">E-mail: admin@mariotkitchen.com<br>E-mail: info@mariotkitchen.com<br>ABU DHABI P.O.BOX. 39468</div>
                        </td>
                        <td style="padding:0 8px;">
                            <div style="margin-bottom:9px;"><div style="font-size:10.5px;font-weight:900;color:#111;margin-bottom:1px;">Dubai Showroom</div><div style="font-size:9px;color:#444;line-height:1.35;">Salah Al Din St. Dubai, UAE</div><div style="font-size:9.5px;font-weight:bold;color:#111;">📞 +971 4-288-2777</div></div>
                            <div><div style="font-size:10.5px;font-weight:900;color:#111;margin-bottom:1px;">Abu Dhabi Showroom</div><div style="font-size:9px;color:#444;line-height:1.35;">Near Madinat Zayed, Abu Dhabi</div><div style="font-size:9.5px;font-weight:bold;color:#111;">📞 +971 2-677-4544</div></div>
                        </td>
                        <td style="padding:0 8px;">
                            <div style="margin-bottom:9px;"><div style="font-size:10.5px;font-weight:900;color:#111;margin-bottom:1px;">Al Ain Showroom</div><div style="font-size:9px;color:#444;line-height:1.35;">Industrial Area, Al Ain, UAE</div><div style="font-size:9.5px;font-weight:bold;color:#111;">📞 +971 3-722-7337</div></div>
                            <div><div style="font-size:10.5px;font-weight:900;color:#111;margin-bottom:1px;">Mariot Factory</div><div style="font-size:9px;color:#444;line-height:1.35;">Industrial Area 11, Sharjah, UAE</div><div style="font-size:9.5px;font-weight:bold;color:#111;">📞 +971 6-535-1340</div></div>
                        </td>
                        <td style="padding:0 8px;">
                            <div style="margin-bottom:9px;"><div style="font-size:10.5px;font-weight:900;color:#111;margin-bottom:1px;">Abu Dhabi Showroom</div><div style="font-size:9px;color:#444;line-height:1.35;">Tourist Club, Abu Dhabi, UAE</div><div style="font-size:9.5px;font-weight:bold;color:#111;">📞 +971 2-645-9353</div></div>
                            <div><div style="font-size:10.5px;font-weight:900;color:#111;margin-bottom:1px;">Sharjah Showroom</div><div style="font-size:9px;color:#444;line-height:1.35;">Jamal Abdu Naser St. Sharjah</div><div style="font-size:9.5px;font-weight:bold;color:#111;">📞 +971 6-767-7777</div></div>
                        </td>
                        <td style="width:105px;padding-left:8px;text-align:right;">
                            <div style="font-size:10px;font-weight:700;color:#111;direction:rtl;margin-bottom:14px;">تم الاستلام بواسطة :</div>
                            <div style="text-align:right;"><div style="font-size:10.5px;font-weight:900;color:#111;margin-bottom:1px;">Mariot Syria</div><div style="font-size:9px;color:#444;line-height:1.35;">Damascus, Syria</div><div style="font-size:9.5px;font-weight:bold;color:#111;">📞 +963 9-450-5000</div></div>
                        </td>
                    </tr></tbody>
                </table>
            </div>
            
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;padding-top:6px;border-top:1px solid #ccc;position:relative;z-index:2;">
                <div style="display:flex;align-items:center;gap:5px;background:#f0f0f0;padding:4px 10px;border-radius:16px;">
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAA3NCSVQICAjb4U/gAAAACXBIWXMAAAPzAAAD8wF1XGupAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAJZQTFRF////SUmSQGCfQFWVPVyZOVuZO1eaPFmZO1qYO1mZO1mYO1mYOlmYPFmYO1mYO1mYO1qYO1mYPVuZP1yaQV6bQ2CcR2OeTWmiVG6lVW+mVnCmV3GnWnOoXnerZHytZn2va4Kxcoe1eY65gJS8ipzCi53CkKHFtsHZuMPau8bbwsvf09ro1Nvo1dvp4ubw9vf6/Pz9////XyoQ3AAAABF0Uk5TAAcIGBktSYSXmMHI2uPy8/XVqDFbAAABA0lEQVQ4y4WT2WKDIBBFcYkswbVp9n2pra1N/P+fC5gII5B4n8B7wJlhBiElL6KMpylnNPKQrZAkuVJCQsP2cZb3lGEf+sE4tzQOtD+Kc4fikTrv9AXxvMMH90+/vn/r+tj95REH1v78v5E6d3vc5gfi/2n95qJykdkS7X/chHut/47qCxH1A/VZyOMHGGfioQhs1xJY9zKJEFXrYrqVwGYyKTRAEVPrXdPppAGGuAPYa4Cj1AGsNJACYFlW0q3K8hMC/H0WHATpBBhI0wnQ4ULBUtuAKDV8LBsg/ee2gPa5QcNYADZazgSeLaeb1gDiwGz7YiZU2G0/PDjDozc8vK/H/w603kSHess3kQAAAABJRU5ErkJggg==" style="width:14px;height:14px;" alt="fb">
                    <img src="data:image/png;base64,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" style="width:14px;height:14px;" alt="ig">
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFjSURBVFiF7ZYxSwNBEEa/WaIWUUQhhY2FIJIrrFOoRRBBkGBrIaYKWNiIhXb+CZPWSqysRUHwAmJr4aVQK4ugjSIhJgb2s0oQc5i9vcRrbrpZZt+8ZYbjgDgiDgl1+5Bq6cVb0yI5AWYBJH+A792is9ULkbDtvVjwpuS1ckaRjN8rCEybcJRN89WdhxEkcE4gY3M/tEBNtzYBzIdtbi0AzbxBVd0EZbcDIn6vdwVyoIkmlW7oBqoDEVjZu0t+1jH2+5zkcbnk3ATlBR6B/hj1lVaCr6AsK4F+h9GHaGG7squUngMAEsOA5LtJciXQj51cq2u3lD7pxTbaARHuk5L6s4jMEpLtpMI0gJ4CAxuBADSpi3wHIhcw2wGwCFEOAJAcArDeXYNbiDy3c4IXZuyAsVx4Gm8mmu8+pI3ykXMalBf5CGKBWCAWiAUC/5JNvM3UqqnKpQCT7TMBWtTK669aHP8U3wz/X3jLfr/9AAAAAElFTkSuQmCC" style="width:14px;height:14px;" alt="yt">
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAA3NCSVQICAjb4U/gAAAACXBIWXMAAAPzAAAD8wF1XGupAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAUpQTFRF////2yQkvyAgyiArzB8pzCIoyx8myyEnyyAnyyAnyyAoyyAozCAnyx8nyyAnyx8nyyAnyyAnyyEoyyIpzCMqzCgvzSkwzjA2zjI5zzQ6zzU8zzc9zzg+0DpA0T5E0T9F0UFH0UNI0UNJ0kVL0kZM0khN00xR005U009U1FFW1FFX1VZb1Vle1Vpf1lpg1ltg1l9k12Bl2Gdr2Gpv2Wtv2Wxw2W1y2W9z2nZ623d723h83Ht/3HyA3H2B3ICE3YKG3YOH3YSI3ouO34+S35GU4JOW4Zea4Zmc4p2g4p+i4qCi4qCj46Kl46Om46ap46eq5Kmr5Kqs5Kuu5a6x5a+y5rS25ra45ri557y9572/6MHC6srL68/Q69TV7NXW7NjZ7dna7dzd7uDg7uLi7uPk7+np8Ovr8Ozs8O3t8O7u8O/v8fDw8fHx8fLyC/ubfwAAABF0Uk5TAAcIGBktSYSXmMHI2uPy8/XVqDFbAAABfUlEQVQ4y4VTV1vCQBAMCOkImyD23sXeO2Lv2AsWVOw6///VC1yOUPzYp8nsZm/LrCQJ88mabobDpq7JPqncAmotCatVAyVuvxKhIosofq+/xqAyM2oK/mCIKlgoKP6v6GcRPIffoH/MyNehCKItmX5+vE+N2C6h5Ppz67eTnwCyX0Cm0+3F6VblH9YVcD7ZSnVTWbz2c1Jl83PnkwC2rRxq+cCDOzGfJHPY9I0Nii3ORxk+BoY4LUsaRzN4idIZsMDwIEvGaU3SOdrHETWwIlecboBdTuuSydEhdijOAvoYHihkMKUwR8u4pGbgzalhHNjkdFgExPHbYb8j7eA9YFgEuE9Yp5juzafu+kHGEk/oYtDx+iXghCh2A6yRKFLzLOeCFXmbegIOxDY0MSjnlSyOr1nM25YlOLkwaqJ2YJS6Z3tsjzh9hWURTeArVqII1btuWs036ZVuoEgw65grCVCKJZe4sytKToh2rLGyaKvLvvrhVD+96sf7//n/AeymX3N02kSmAAAAAElFTkSuQmCC" style="width:14px;height:14px;" alt="tw">
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAsQAAALEBxi1JjQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGsSURBVFiF7dbPahNRFMfxzwzB4p9UowtdWWPoQoVCH6ArcREQ+gYFu+yTdNsHcOMr9CkEuxDELEpNFnWh2JamJmCsHBeTtCkoZCZDs2i/cOAyc+89v+H8Bn5cc9VJJtkU3MUt3Bx7fAO3h+seBmPv+ugndCcWEDzGGzxDHQu4M9akKN2hwC9o4zPeJXw92xG8CrpBXFIdBy8hCaro4P6UX5qXA9RTrM6gOTzAaoqlGTQfsZTi+QwFvEjxKNeRRoP1ddK0DAEPBZ1cDl5ejoiI2NmJWFmZ9m/oCA4KCRixvR1RrxcVcCjoTSUgIqLfj9jcjKhW8wroCU6nFjBifz9ibS0iSSa973cpTjpjbo5aLY9Bk3JGMBhEbG1FzM/nHcHPckzYaBQ14Q9Bu5CAViui2SzaeFR7gg+5Di0uRmxsRFQq0zaP4H0F33IZbXc3q3L4nqJV1m0FaKX4OEMBn5LI8l4btUtufownIGgGJyWYatLqBa+5GEoXnIfSp7KQek+WfqfhDw5lIbQj89zbhL0LAv5HnMfv0Ygqshz5L05wOlwfyaL5r6LKr7ka/AXL2d7/fwgUogAAAABJRU5ErkJggg==" style="width:14px;height:14px;" alt="wa">
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAJvSURBVFiF7ZbPSxRhGMc/78w06+oqLLuZqSCJUlmoBV1KyEARpEux2i9P/Q2CXSoyCCSMztFB+inaISgRIqKgQ13SJCmTPGhuWW7q6q47u+2+HfIH0zaZsrPboe9leJ7nnff7YXjmfR8BwJmHbiTnQPiAYuyUZALBPdAv0FE/J36ai+dAha3GySTDGLEaBSnOp98cQOzCoZ9VAF/6zZckaVKArRkDEBQpgJIxAFAszV26ys1jVcy3N/C+9SDNlfZ8KEuAzsM7adlThEtXKffmcPt4NdWFeekDaNyeb4o1RdBQvjl9AP5gJCk3tWCkD6Ctf4RQNL4Svxifpfu1P+UAgrY+aVUscTupK/MysxjjwdspYnHLpRuWZlVwblKpLfWgCoE3W2d/iZtnY99QFcHJ6kKcmgrAl5DB/eEpCnIdHN1dQLknm7iE0ekQPUOfmFmMbQygrsxDV1PlSjwZjFB86QkV+S5uNFet5KWEE3cHuO6rxKWrpj0uN+7Ad+sVj0anLQEse0D75YjQFAGAuvRclhDQ1VyVZA6Q69DobdnLFpdj/QDrUZZmvU2eQ+P0PusbPiUAgXCUQ9de4m1/zKnuQaLxhKleW+qxF6C17x1PxwIEwlHuDPrpGfpkqm9zO+0F6B/5aooH/EFTnPOb/kgpwFzE/KstGHFTnKXZDLCWhLCuZXIW+A/wjwNMBiMY31cPlA+BMACBUJRwbLXLP88bxBIy6d2EXM1NzCbPFsv643WcDilAYs1V9imhAKkfc/5eHxWgN2P2UvYqGNF2kMPpN+cNwnFR4eqRWXAcAK4gmQDsbEoJjCNlJ0KvoaN+7gfpQ70KFALHSgAAAABJRU5ErkJggg==" style="width:14px;height:14px;" alt="li">
                    <span style="font-size:11px;color:#111;margin-left:5px;font-weight:900;">@Mariot kitchen equipment</span>
                </div>
                <div style="font-size:11.5px;color:#111;font-weight:800;display:flex;gap:28px;">
                    <span>www.mariotstore.com</span><span>www.mariot-group.com</span>
                </div>
            </div>
        </div>`;

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '-10000px';
        container.style.left = '0';
        container.innerHTML = pageHtml;
        document.body.appendChild(container);

        await new Promise(r => setTimeout(r, 200));

        // Note: For chunked rendering, each page container should map exactly or slightly above 1123 unless text really spans heavily.
        const renderedHeight = container.firstElementChild ? (container.firstElementChild).offsetHeight + 40 : 1250;

        const canvas = await html2canvas(container, {
            scale: 2, useCORS: false, allowTaint: true, logging: false, backgroundColor: '#ffffff',
            width: 794, height: renderedHeight, windowWidth: 794, windowHeight: renderedHeight, scrollY: 0, scrollX: 0
        });

        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfHeightForPage = (canvas.height * pdfWidth) / canvas.width;

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeightForPage);
    }

    return pdf.output('datauristring');

};

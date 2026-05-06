import { BASE_URL } from '@/config';
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
    // Page 1: fits fewer items due to header/info (~6)
    // Subsequent pages: fits more (~12)
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

            await new Promise(r => setTimeout(r, 300)); // Buffer for layout engine

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

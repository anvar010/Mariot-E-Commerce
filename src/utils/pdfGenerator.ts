import { BASE_URL } from '@/config';

export interface InvoicePDFData {
    invoice_number: string;
    order_id: number;
    customer_name: string;
    given_by_name?: string;
    final_amount: number;
    delivery_charge?: number;
    items: any[];
}
// Dynamically imported when generated to fix next.js SSR build errors

// Helper to resolve image URLs inside the PDF generator
const resolveImageUrl = (url?: string) => {
    if (!url) return '/assets/placeholder-image.webp';
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('/assets/')) return url;

    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// 1x1 transparent PNG — safe fallback that html2canvas can render without any HTTP fetch
const EMPTY_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=';

// Convert an image URL to a base64 data URI.
// Same-origin assets are fetched directly by the browser (no proxy round-trip).
// Cross-origin images (e.g. the QR code API) go through the server-side proxy.
const imageToBase64 = async (url: string): Promise<string> => {
    try {
        const fullUrl = url.startsWith('http') ? url : new URL(url, window.location.origin).toString();
        const isSameOrigin = fullUrl.startsWith(window.location.origin + '/');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        if (isSameOrigin) {
            // Direct fetch — no server round-trip needed for local public assets
            const response = await fetch(fullUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) return EMPTY_IMG;
            const blob = await response.blob();
            return await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string) || EMPTY_IMG);
                reader.onerror = () => resolve(EMPTY_IMG);
                reader.readAsDataURL(blob);
            });
        } else {
            // Cross-origin (QR code API, CDN images, etc.) — route through proxy to avoid canvas taint
            const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(fullUrl)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                console.warn(`imageToBase64: proxy failed with ${response.status} for ${url}`);
                return EMPTY_IMG;
            }
            const data = await response.json();
            if (data.success && data.base64) return data.base64;
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.error('imageToBase64 timed out for URL:', url);
        } else {
            console.error('imageToBase64 error:', error, 'for URL:', url);
        }
    }

    return EMPTY_IMG;
};

// Origin for the "more…" links, taken from the page the PDF is generated on, so a
// quotation always points back at the site it came from — uae.mariotstore.com, a
// staging host, or localhost in development. A hardcoded origin meant every PDF
// linked to production no matter where it was produced.
const siteOrigin = (): string => {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
        return window.location.origin.replace(/\/+$/, '');
    }
    // Only reachable if this ever runs server-side; the generator is client-only today.
    return 'https://mariotstore.com';
};

export const generateQuotationPDF = async (quotation: any, shouldDownload = false, isArabic = false): Promise<string> => {
    const items = typeof quotation.items === 'string' ? JSON.parse(quotation.items) : (quotation.items || []);

    const formatDate = (dateStr: any) =>
        new Date(dateStr || new Date()).toLocaleDateString('en-GB', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

    // Pre-convert all images to base64 to avoid CORS issues in html2canvas.
    // Use the Arabic logo on the Arabic quotation.
    const logoBase64 = await imageToBase64(window.location.origin + (isArabic ? '/MARIOT-A.webp' : '/assets/mariot-logo.webp'));
    const itemImageBase64s = await Promise.all(
        items.map((item: any) => imageToBase64(resolveImageUrl(item.image)))
    );

    // Monolingual quotation: every label follows the site language; layout direction flips for Arabic.
    const dir = isArabic ? 'rtl' : 'ltr';
    const alignStart = isArabic ? 'right' : 'left';
    const alignEnd = isArabic ? 'left' : 'right';
    const L = isArabic ? {
        quotation: 'تسعيرة', ref: 'مرجع التسعيرة', issueDate: 'تاريخ إصدار التسعيرة',
        issuedFrom: 'صادر من', issuedTo: 'صادر إلى',
        companyName: 'متجر ماريوت', companyLegal: 'ماريوت لتجارة معدات المطابخ ذ.م.م', vat: 'الرقم الضريبي',
        note: 'لن يتم حجز المنتجات في هذه التسعيرة إلا بعد إتمام الطلب',
        thRef: 'رقم المرجع', thName: 'اسم المنتج', thImage: 'صورة المنتج', thQty: 'الكمية', thUnit: 'سعر الوحدة', thTotal: 'مجموع السعر',
        brand: 'الماركة', model: 'الموديل',
        totalAmounts: 'إجمالي المبلغ', subtotal: 'الإجمالي (غير شامل الضريبة)', coupon: 'خصم القسيمة', points: 'خصم النقاط', discount: 'الخصم', vatLine: 'إجمالي الضريبة (5٪)', grandTotal: 'إجمالي المبلغ المستحق',
        terms: 'الشروط والأحكام',
        term1: '١. الأسعار صالحة لمدة ٧ أيام فقط من تاريخ الإصدار.',
        term2: '٢. هذه تسعيرة معدة بواسطة الكمبيوتر ولا تتطلب توقيعاً.',
        term3: '٣. توفر المخزون عرضة للتغيير عند تأكيد الطلب.',
        thankyou: 'شكراً لاختياركم متجر ماريوت', continued: 'يتبع في الصفحة التالية...', continuedRef: 'مرجع التسعيرة',
    } : {
        quotation: 'Quotation', ref: 'Quotation Ref.', issueDate: 'Quotation Issue Date',
        issuedFrom: 'Issued from', issuedTo: 'Issued to',
        companyName: 'Mariot Store', companyLegal: 'Mariot Kitchen Equipment Trading LLC', vat: 'VAT#',
        note: "This quotation won't reserve the available stock for you until you place an order",
        thRef: 'Ref no.', thName: 'Product Name', thImage: 'Product Image', thQty: 'QTY', thUnit: 'Unit Price', thTotal: 'Total Price',
        brand: 'Brand', model: 'Model',
        totalAmounts: 'Total Amounts', subtotal: 'Subtotal (Excl. VAT)', coupon: 'Coupon Discount', points: 'Reward Points', discount: 'Discount', vatLine: 'Total VAT (5%)', grandTotal: 'Grand Total',
        terms: 'Terms & Conditions',
        term1: '1. Prices are valid for 7 days only from issue date.',
        term2: '2. This is a computer generated quotation, signature not required.',
        term3: '3. Stock availability is subject to change at time of order.',
        thankyou: 'THANK YOU FOR CHOOSING MARIOT STORE', continued: 'Continued on next page...', continuedRef: 'Quotation Ref',
    };

    // Embed the UAE Dirham symbol font (U+20C3) as base64 so html2canvas can render the new
    // dirham symbol. English uses the symbol; Arabic uses the word "درهم" (matches the site).
    let dirhamFontFace = '';
    try {
        const fontCtrl = new AbortController();
        const fontTimeout = setTimeout(() => fontCtrl.abort(), 5000);
        const fontRes = await fetch('/fonts/dirham.woff2', { signal: fontCtrl.signal });
        clearTimeout(fontTimeout);
        const buf = await fontRes.arrayBuffer();
        let bin = '';
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        const b64 = btoa(bin);
        dirhamFontFace = `@font-face{font-family:'DirhamPDF';src:url(data:font/woff2;base64,${b64}) format('woff2');font-weight:normal;font-style:normal;}`;
    } catch (e) { /* fall back to AED text below */ }

    const DIRHAM = '⃃';
    const fmtNum = (n: any) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // Money cell: Arabic → "1,234.00 درهم"; English → new dirham symbol + amount.
    const money = (n: any) => isArabic
        ? `<span dir="ltr">${fmtNum(n)}</span> درهم`
        : `${dirhamFontFace ? `<span style="font-family:'DirhamPDF';">${DIRHAM}</span> ` : 'AED '}<span dir="ltr">${fmtNum(n)}</span>`;

    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();

    // ── Spec line processor (reused by measurement probe + page renderer) ─
    // The product description as a single flowing paragraph. The admin writes it as HTML, so
    // tags and bullet markers are stripped to plain text and the whole thing is capped: a long
    // description would otherwise push one line item across several pages of the quotation.
    // The quotation shows the product description, capped at five lines. Past that
    // a single verbose product would push one line item across several pages, so the
    // rest is replaced by a "more…" link back to the product page where the full
    // text lives. Descriptions in this catalogue are newline-separated spec lines
    // ("Capacity: 4 × GN 1/1"), so clamping by LINE keeps whole facts intact —
    // clamping by character count would cut one in half.
    const DESC_MAX_LINES = 5;
    const DESC_MAX_LINE_CHARS = 110;

    const productUrl = (item: any): string => {
        const slug = item.slug || item.product_slug || '';
        if (!slug) return '';
        // Slugs in this catalogue contain non-ASCII and reserved characters (one reads
        // "…-4-×-gn-1/1,-ash-oak-…"), which a PDF viewer will not open unescaped.
        // encodeURI leaves "/" intact, which matters because the product route is a
        // catch-all and those slashes are real path segments.
        // localePrefix is 'always' in i18n/routing, so the locale segment is required.
        return encodeURI(`${siteOrigin()}/${isArabic ? 'ar' : 'en'}/product/${slug}`);
    };

    const buildItemDescription = (item: any): { lines: string[]; truncated: boolean } => {
        // Older quotations carry only `specifications`, so fall back to those.
        const source = (isArabic && (item.description_ar || item.specifications_ar))
            ? (item.description_ar || item.specifications_ar)
            : (item.description || item.specifications || '');

        const all = String(source)
            .replace(/<\/?(p|div|br|li|ul|ol|tr|td)[^>]*>/gi, '\n')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\[[^\]]*\]/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/â€¢/g, ' ').replace(/â€"/g, '-').replace(/Â/g, '')
            .split(/\r?\n/)
            .map(l => l.replace(/[•·]/g, ' ').replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            // The first line repeats the product name, which is already the heading
            // directly above it.
            .filter((l, i) => !(i === 0 && item.name && l.toLowerCase() === String(item.name).toLowerCase().trim()));

        const lines = all.slice(0, DESC_MAX_LINES).map(l =>
            l.length > DESC_MAX_LINE_CHARS ? l.slice(0, DESC_MAX_LINE_CHARS).trim() + '…' : l
        );
        return { lines, truncated: all.length > DESC_MAX_LINES };
    };

    // ── Single item <tr> builder (reused by measurement probe + page renderer) ─
    const buildItemRowHTML = (item: any, imgSrc: string, displayNum: number): string => {
        const dims = item.custom_dimensions && typeof item.custom_dimensions === 'object'
            ? Object.entries(item.custom_dimensions)
                .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}cm`).join(' · ')
            : '';
        const variantLabel = item.variant_label || '';
        const itemName = (isArabic && item.name_ar) ? item.name_ar : item.name;
        const itemDesc = buildItemDescription(item);
        const itemUrl = productUrl(item);
        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 15px 6px; font-size: 11px; text-align: ${alignStart};" dir="ltr">${displayNum}</td>
                <td style="padding: 15px 10px; font-size: 11px; text-align: ${alignStart}; width: 35%;">
                    <div style="font-weight: bold; color: #1e293b;">${itemName}</div>
                    <div style="color: #64748b; font-size: 10px;">${L.brand}: ${item.brand || 'Standard'}</div>
                    ${item.model ? `<div style="color: #64748b; font-size: 10px; margin-top: 4px;">${L.model}: ${item.model}</div>` : ''}
                    ${itemDesc.lines.length ? `<div style="margin-top: 4px; color: #475569; font-size: 9.5px; line-height: 1.5;">${itemDesc.lines.map(l => `<div>${l}</div>`).join('')}${itemDesc.truncated && itemUrl ? `<a data-more-url="${itemUrl}" href="${itemUrl}" style="color: #2563eb; text-decoration: underline; display: inline-block; margin-top: 2px;">more…</a>` : (itemDesc.truncated ? `<div style="color:#94a3b8;">more…</div>` : '')}</div>` : ''}
                    ${(variantLabel && !dims) ? `<div style="color: #64748b; font-size: 10px;">${variantLabel}</div>` : ''}
                    ${dims ? `<div style="color: #334155; font-size: 10px; margin-top: 4px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; display: inline-block;">${dims}</div>` : ''}
                </td>
                <td style="padding: 15px 10px; text-align: center;">
                    <img src="${imgSrc}" style="height: 80px; width: 80px; object-fit: contain;">
                </td>
                <td style="padding: 15px 10px; text-align: center; font-size: 12px;">${item.quantity}</td>
                <td style="padding: 15px 10px; text-align: ${alignEnd}; font-size: 12px;">${money(item.price)}</td>
                <td style="padding: 15px 10px; text-align: ${alignEnd}; font-size: 12px; font-weight: bold;">${money(Number(item.price) * item.quantity)}</td>
            </tr>`;
    };

    // ── Measure each item's actual rendered row height ─────────────────────
    // Render all rows together in a hidden table at the correct inner width
    // (794px container − 2×40px padding = 714px) so text wraps identically to
    // the final page, then read each <tr>'s offsetHeight.
    const measureItemHeights = async (): Promise<number[]> => {
        const probe = document.createElement('div');
        probe.setAttribute('dir', dir);
        probe.style.cssText =
            'position:absolute;top:-20000px;left:0;width:714px;' +
            'font-family:"Inter","Segoe UI",Tahoma,Geneva,Verdana,sans-serif;';
        const tbl = document.createElement('table');
        tbl.style.cssText = 'width:100%;border-collapse:collapse;';
        probe.appendChild(tbl);
        document.body.appendChild(probe);

        for (let i = 0; i < items.length; i++) {
            const tmp = document.createElement('tbody');
            tmp.innerHTML = buildItemRowHTML(items[i], itemImageBase64s[i], i + 1);
            const tr = tmp.querySelector('tr');
            if (tr) tbl.appendChild(tr);
        }

        const imgs = Array.from(tbl.querySelectorAll('img')) as HTMLImageElement[];
        await Promise.all(imgs.map(img =>
            (img.complete && img.naturalWidth > 0) ? Promise.resolve() :
            new Promise<void>(res => {
                img.addEventListener('load', () => res(), { once: true });
                img.addEventListener('error', () => res(), { once: true });
                setTimeout(res, 3000);
            })
        ));
        await new Promise(r => requestAnimationFrame(r)); // one layout tick

        const heights = (Array.from(tbl.querySelectorAll('tr')) as HTMLTableRowElement[])
            .map(r => r.offsetHeight);
        document.body.removeChild(probe);
        return heights;
    };

    // ── Greedy page packer ─────────────────────────────────────────────────
    // Usable height inside the 794×1122px page container (40px padding each side).
    const PAGE_H = 1042;
    const SAFETY = 20; // px guard against sub-pixel rounding

    // Overhead = everything on the page that is NOT item rows.
    // OH_PAGE1  : top-bar + ref/date + from/to block + note box + table header
    // OH_CONT   : top-bar + "continued ref" banner   + table header
    // OH_TOTALS : totals block + terms + thank-you line (last page only)
    // OH_CFOOTER: "continued on next page" text      (non-last pages)
    const OH_PAGE1   = 390;
    const OH_CONT    = 110;
    const OH_TOTALS  = 330;
    const OH_CFOOTER =  50;

    const itemBudget = (isFirst: boolean, isLast: boolean) =>
        PAGE_H - (isFirst ? OH_PAGE1 : OH_CONT) - (isLast ? OH_TOTALS : OH_CFOOTER) - SAFETY;

    const packItemsGreedy = (heights: number[]): number[][] => {
        if (heights.length === 0) return [[]];

        const chunks: number[][] = [];
        let chunk: number[] = [];
        let used = 0;

        for (let i = 0; i < heights.length; i++) {
            const budget = itemBudget(chunks.length === 0, false); // forward pass: assume not last
            if (chunk.length === 0 || used + heights[i] <= budget) {
                chunk.push(i);
                used += heights[i];
            } else {
                chunks.push(chunk);
                chunk = [i];
                used = heights[i];
            }
        }
        if (chunk.length > 0) chunks.push(chunk);

        // Retroactive last-page correction: the last chunk now needs OH_TOTALS instead of
        // OH_CFOOTER. Move items off the end until it fits (or only one item remains).
        let guard = heights.length;
        while (guard-- > 0) {
            const li   = chunks.length - 1;
            const last = chunks[li];
            const lastH = last.reduce((s, i) => s + heights[i], 0);
            if (lastH <= itemBudget(li === 0, true) || last.length <= 1) break;
            const moved = last.pop()!;
            chunks.push([moved]);
        }

        return chunks;
    };

    // ── Measure then pack ─────────────────────────────────────────────────
    const itemHeights  = await measureItemHeights();
    const chunkIndices = packItemsGreedy(itemHeights); // arrays of original item indices

    // ── Full-page HTML builder ────────────────────────────────────────────
    const getPageHTML = (idxChunk: number[], isFirstPage: boolean, isLastPage: boolean): string => {
        const itemRowsHTML = idxChunk
            .map(origIdx => buildItemRowHTML(items[origIdx], itemImageBase64s[origIdx], origIdx + 1))
            .join('');

        return `
            <div dir="${dir}" style="width: 794px; min-height: 1122px; background: white; padding: 40px; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155; line-height: 1.5; box-sizing: border-box; display: flex; flex-direction: column;">
                <style>${dirhamFontFace}</style>
                <!-- Header bar (every page) -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 10px; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 12px; height: 12px; background: #334155;"></div>
                        <span style="font-size: 24px; font-weight: bold; color: #334155;">${L.quotation}</span>
                    </div>
                    <img src="${logoBase64}" alt="Logo" style="height: 50px;">
                </div>

                ${isFirstPage ? `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; font-size: 14px;">
                        <div style="text-align: ${alignStart};">
                            <div style="color: #64748b; margin-bottom: 4px;">${L.ref}</div>
                            <div style="font-weight: bold; font-size: 16px;" dir="ltr">${quotation.quotation_ref || 'N/A'}</div>
                        </div>
                        <div style="text-align: ${alignEnd};">
                            <div style="color: #64748b; margin-bottom: 4px;">${L.issueDate}</div>
                            <div style="font-weight: bold; font-size: 16px;">${formatDate(quotation.created_at)}</div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px;">
                        <div style="padding: 15px; border-${alignEnd}: 1px solid #e2e8f0; text-align: ${alignStart};">
                            <div style="font-size: 12px; color: #64748b; margin-bottom: 10px;">${L.issuedFrom}</div>
                            <div style="font-weight: bold; font-size: 15px; margin-bottom: 4px;">${L.companyName}</div>
                            <div style="font-size: 13px; color: #334155;">${L.companyLegal}</div>
                            <div style="font-size: 12px; color: #334155; margin-top: 8px; line-height: 1.7;">
                                <div dir="${dir}" style="text-align:${alignStart};">📞 <span dir="ltr">+971 4 288 2777&nbsp;&nbsp;|&nbsp;&nbsp;+971 50 311 4080</span></div>
                                <div dir="${dir}" style="text-align:${alignStart};">✉ <span dir="ltr">Admin@mariotkitchen.com</span></div>
                                <div dir="${dir}" style="text-align:${alignStart};">✉ <span dir="ltr">Support@mariot-group.com</span></div>
                                <div dir="${dir}" style="text-align:${alignStart};">🌐 <span dir="ltr">www.mariotstore.com</span></div>
                            </div>
                            <div style="background: #f1f5f9; padding: 4px 10px; border-radius: 20px; display: inline-block; margin-top: 10px; font-size: 12px;" dir="ltr">
                                ${L.vat} 100412345600003
                            </div>
                        </div>
                        <div style="padding: 15px; text-align: ${alignStart};">
                            <div style="font-size: 12px; color: #64748b; margin-bottom: 10px;">${L.issuedTo}</div>
                            <div style="font-weight: bold; font-size: 15px; margin-bottom: 4px;">${quotation.customer_name || 'Valued Customer'}</div>
                            <div style="font-size: 13px; color: #334155; text-align:${alignStart};" dir="ltr">${quotation.customer_phone || ''}</div>
                            <div style="font-size: 13px; color: #334155; text-align:${alignStart};" dir="ltr">${quotation.customer_email || ''}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px; padding: 12px 20px; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 30px;">
                        <div style="width: 24px; height: 24px; min-width: 24px; border: 2px solid #334155; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">i</div>
                        <div style="flex: 1; font-size: 12px; color: #334155; text-align: ${alignStart};">${L.note}</div>
                    </div>
                ` : `
                    <div style="margin-bottom: 20px; font-size: 14px; color: #64748b; text-align: ${alignStart};">
                        ${L.continuedRef}: ${quotation.quotation_ref || 'N/A'} (${L.continued})
                    </div>
                `}

                <!-- Items table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="border-bottom: 2px solid #e2e8f0; background: #f8fafc; font-size: 10px; color: #64748b;">
                            <!-- The cell holds a line number, so the column only needs to fit
                                 two digits; without a width cap the header text alone stretched
                                 it and squeezed the product name column. -->
                            <th style="padding: 10px 6px; text-align: ${alignStart}; width: 7%; white-space: nowrap;">${L.thRef}</th>
                            <th style="padding: 10px; text-align: ${alignStart}; width: 38%;">${L.thName}</th>
                            <th style="padding: 10px; text-align: center;">${L.thImage}</th>
                            <th style="padding: 10px; text-align: center;">${L.thQty}</th>
                            <th style="padding: 10px; text-align: ${alignEnd};">${L.thUnit}</th>
                            <th style="padding: 10px; text-align: ${alignEnd};">${L.thTotal}</th>
                        </tr>
                    </thead>
                    <tbody>${itemRowsHTML}</tbody>
                </table>

                ${isLastPage ? `
                    <!-- Totals -->
                    <div style="margin-top: auto; margin-bottom: 40px; background: #fafafa; padding: 20px; border-radius: 8px;">
                        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; text-align: ${alignStart};">
                            <span style="font-size: 13px; font-weight: bold; color: #64748b;">${L.totalAmounts}</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                <span>${L.subtotal}</span><span style="font-weight: bold;">${money(quotation.subtotal)}</span>
                            </div>
                            ${Number(quotation.coupon_discount) > 0 ? `
                            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #16a34a;">
                                <span>${L.coupon}${quotation.coupon_code ? ` (${quotation.coupon_code})` : ''}</span>
                                <span style="font-weight: bold;">- ${money(quotation.coupon_discount)}</span>
                            </div>` : ''}
                            ${Number(quotation.points_discount) > 0 ? `
                            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #16a34a;">
                                <span>${L.points}${Number(quotation.points_used) > 0 ? ` (${quotation.points_used} pts)` : ''}</span>
                                <span style="font-weight: bold;">- ${money(quotation.points_discount)}</span>
                            </div>` : ''}
                            ${(!(Number(quotation.coupon_discount) > 0) && !(Number(quotation.points_discount) > 0) && Number(quotation.discount_amount) > 0) ? `
                            <div style="display: flex; justify-content: space-between; font-size: 13px; color: #16a34a;">
                                <span>${L.discount}</span>
                                <span style="font-weight: bold;">- ${money(quotation.discount_amount)}</span>
                            </div>` : ''}
                            <div style="display: flex; justify-content: space-between; font-size: 13px;">
                                <span>${L.vatLine}</span><span style="font-weight: bold;">${money(quotation.tax_amount)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 16px; margin-top: 10px; padding-top: 10px; border-top: 2px solid #e2e8f0; color: #334155;">
                                <span><strong>${L.grandTotal}</strong></span>
                                <span style="font-weight: 800; font-size: 20px; color: #334155;">${money(quotation.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                    <!-- Terms -->
                    <div style="display: flex; flex-direction: column; gap: 20px;">
                        <div style="font-size: 10px; color: #64748b; text-align: ${alignStart};">
                            <div style="font-weight: bold; color: #334155; margin-bottom: 5px;">${L.terms}</div>
                            <div style="margin-bottom: 3px;">${L.term1}</div>
                            <div style="margin-bottom: 3px;">${L.term2}</div>
                            <div style="margin-bottom: 3px;">${L.term3}</div>
                        </div>
                        <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; font-weight: bold; color: #334155;">
                            ${L.thankyou}
                        </div>
                    </div>
                ` : `
                    <div style="margin-top: auto; text-align: center; font-size: 10px; color: #64748b; padding-top: 20px;">
                        ${L.continued}
                    </div>
                `}
            </div>
        `;
    };

    // ── Render each chunk as one PDF page ─────────────────────────────────
    try {
        for (let i = 0; i < chunkIndices.length; i++) {
            const isFirst = i === 0;
            const isLast  = i === chunkIndices.length - 1;

            const pageContainer = document.createElement('div');
            pageContainer.style.position = 'absolute';
            pageContainer.style.top = '-10000px';
            pageContainer.style.left = '0';
            pageContainer.setAttribute('dir', dir);
            pageContainer.style.direction = dir;
            pageContainer.innerHTML = getPageHTML(chunkIndices[i], isFirst, isLast);
            document.body.appendChild(pageContainer);

            try { if (dirhamFontFace) await (document as any).fonts.load("16px 'DirhamPDF'"); await (document as any).fonts.ready; } catch (e) { /* ignore */ }

            const imgEls = Array.from(pageContainer.querySelectorAll('img')) as HTMLImageElement[];
            await Promise.all(imgEls.map(img => (img.complete && img.naturalWidth > 0)
                ? Promise.resolve()
                : new Promise<void>(res => {
                    const done = () => res();
                    img.addEventListener('load', done, { once: true });
                    img.addEventListener('error', done, { once: true });
                    setTimeout(done, 4000);
                })));
            await new Promise(r => setTimeout(r, 200));

            const canvas = await html2canvas(pageContainer, {
                scale: 2, useCORS: false, allowTaint: true, logging: false,
                backgroundColor: '#ffffff', width: 794, windowWidth: 794
            });

            // html2canvas rasterises the page, so the <a> above is only pixels. Capture
            // each link's box now, while the DOM still exists, and lay a real PDF link
            // annotation over it after the image is placed.
            const contRect = pageContainer.getBoundingClientRect();
            const linkBoxes = Array.from(pageContainer.querySelectorAll('[data-more-url]')).map((el) => {
                const r = (el as HTMLElement).getBoundingClientRect();
                return {
                    url: (el as HTMLElement).getAttribute('data-more-url') || '',
                    left: r.left - contRect.left,
                    top: r.top - contRect.top,
                    width: r.width,
                    height: r.height,
                };
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pageHeight = pdf.internal.pageSize.getHeight();
            const naturalRenderHeight = (canvas.height * pdfWidth) / canvas.width;
            // If content still overflows (e.g. one very-long-spec item), scale both
            // dimensions proportionally so items are uniformly smaller, never squished.
            let renderWidth = pdfWidth;
            let renderHeight = naturalRenderHeight;
            if (naturalRenderHeight > pageHeight) {
                // Page 1 carries ~390px of header before a single row, so it is the page
                // most likely to run a few pixels past A4 — and shrinking BOTH dimensions
                // to absorb that is what made it render narrower than the pages after it.
                // A sub-2% overrun is a rounding artefact, not a layout problem: clamp the
                // height and keep full width so every page comes out the same size. A real
                // overflow still scales proportionally, keeping one very long item legible
                // rather than squashed.
                const overrun = naturalRenderHeight / pageHeight;
                if (overrun <= 1.02) {
                    renderHeight = pageHeight;
                } else {
                    const scale = pageHeight / naturalRenderHeight;
                    renderWidth = pdfWidth * scale;
                    renderHeight = pageHeight;
                }
            }
            const xOffset = (pdfWidth - renderWidth) / 2;

            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', xOffset, 0, renderWidth, renderHeight);

            // 794px is the page container's CSS width; scale to whatever width the
            // image was actually placed at so the hotspots track a scaled page too.
            const pxToMm = renderWidth / 794;
            linkBoxes.forEach(b => {
                if (!b.url || b.width <= 0) return;
                pdf.link(xOffset + b.left * pxToMm, b.top * pxToMm, b.width * pxToMm, b.height * pxToMm, { url: b.url });
            });

            document.body.removeChild(pageContainer);
        }

        const dataUri = pdf.output('datauristring');

        if (shouldDownload) {
            pdf.save(`${quotation.quotation_ref || 'Quotation'}.pdf`);
        } else {
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            const win = window.open(url, '_blank');
            if (!win) {
                // Popup blocked — fall back to download
                const a = document.createElement('a');
                a.href = url;
                a.download = `${quotation.quotation_ref || 'Quotation'}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        }

        return dataUri;
    } catch (error) {
        console.error('PDF Generation Error:', error);
        throw error;
    }
    return '';
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
    // Prices are VAT-exclusive. final_amount = goods (incl 5% VAT) + delivery (not VAT-taxed).
    const grandTotal = Number(data.final_amount);
    const deliveryAmount = Math.max(0, Number(data.delivery_charge) || 0);
    const goodsTotal = Math.max(0, grandTotal - deliveryAmount); // VAT-inclusive goods portion
    const netExVat = goodsTotal / 1.05;                 // post-discount taxable value
    const vatAmount = goodsTotal - netExVat;            // 5% VAT
    // Sum of item line totals = pre-discount, ex-VAT subtotal (matches the rows above).
    const itemsSubtotal = (data.items || []).reduce((sum: number, it: any) => {
        if (Number(it.is_free_gift) === 1) return sum;
        const unit = Number(it.price_at_purchase || it.price || 0);
        return sum + unit * (it.quantity || 1);
    }, 0);
    // Any coupon/points discount is the gap between the item subtotal and the taxable net.
    const discountTotal = Math.max(0, itemsSubtotal - netExVat);

    // Fetch logo + brand images in parallel. The QR is fetched via the same proxy
    // → base64 path so it does NOT taint the canvas (a direct cross-origin <img>
    // with allowTaint makes canvas.toDataURL() throw a SecurityError).
    const QR_URL = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://mariotstore.com';
    const [mariotLogoEnB64, mariotLogoArB64, faviconB64, isoB64, icvB64, qaB64, qrB64, ...brandLogosB64] = await Promise.all([
        imageToBase64(window.location.origin + '/assets/mariot-logo2.webp'),   // English logo — left
        imageToBase64(window.location.origin + '/MARIOT-A.webp'),              // Arabic logo  — right
        imageToBase64(window.location.origin + '/favicon.ico'),                // Icon          — centre
        imageToBase64(window.location.origin + '/ISO.webp'),
        imageToBase64(window.location.origin + '/ICV.webp'),
        imageToBase64(window.location.origin + '/Quality-Assurance.webp'),
        imageToBase64(QR_URL),                                                 // QR — via proxy (no taint)
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

            const isFree = Number((item as any).is_free_gift) === 1;
            const unitPrice = isFree ? 0 : Number(item.price_at_purchase || item.price || 0);
            const lineTotal = unitPrice * (item.quantity || 1);
            const parentName = (item as any).bundle_parent_name || '';
            const modelLine = (item as any).model_number || (item as any).model || '';
            const nameCell = isFree
                ? `${item.name || ''} <span style="display:inline-block;margin-left:4px;padding:1px 5px;background:#10b981;color:#fff;font-size:9px;font-weight:700;border-radius:3px;letter-spacing:0.3px;">FREE</span>${parentName ? `<div style="font-size:10px;font-weight:500;color:#64748b;margin-top:2px;">Free gift with ${parentName}</div>` : ''}`
                : (item.name || '');
            const priceCell = isFree ? 'FREE' : unitPrice.toFixed(2);
            const totalCell = isFree ? 'FREE' : lineTotal.toFixed(2);
            return `
            <tr style="height:27px; color:#111;">
                <td style="border-right:1px solid #1565c0;border-bottom:${btmBorder};font-size:12px;font-weight:700;text-align:center;">${(pageIndex * ITEMS_PER_PAGE) + idx + 1}</td>
                <td style="border-right:1px solid #1565c0;border-bottom:${btmBorder};padding:0 10px;font-size:12px;font-weight:700;">${nameCell}${modelLine ? `<div style="font-size:10px;font-weight:500;color:#64748b;">Model: ${modelLine}</div>` : ''}</td>
                <td style="border-right:1px solid #1565c0;border-bottom:${btmBorder};font-size:12px;font-weight:700;text-align:center;">${item.quantity || 1}</td>
                <td style="border-right:1px solid #1565c0;border-bottom:${btmBorder};padding:0 10px;font-size:12px;font-weight:700;text-align:center;${isFree ? 'color:#10b981;' : ''}">${priceCell}</td>
                <td style="border-bottom:${btmBorder};padding:0 10px;font-size:13px;font-weight:800;text-align:center;${isFree ? 'color:#10b981;' : ''}">${totalCell}</td>
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
                                    <td colspan="3" rowspan="${3 + (discountTotal > 0 ? 1 : 0) + (deliveryAmount > 0 ? 1 : 0)}" style="border-top:1px solid #1565c0;border-right:1px solid #1565c0;padding:10px 14px;vertical-align:top;">
                                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:bold;color:#111;">
                                            <span>Total (AED)</span><span style="flex:1;border-bottom:1px dotted #555;margin:0 10px;"></span><span style="direction:rtl;font-size:13px;">الإجمالي (درهم)</span>
                                        </div>
                                    </td>
                                    <td style="border-top:1px solid #1565c0;border-right:1px solid #1565c0;padding:6px 4px;text-align:center;vertical-align:middle;">
                                        <div style="font-size:11px;font-weight:900;color:#111;">الإجمالي (غير شامل الضريبة)</div><div style="font-size:10px;font-weight:900;color:#111;">Subtotal (Excl. VAT)</div>
                                    </td>
                                    <td style="border-top:1px solid #1565c0;padding:6px 10px;font-size:13px;font-weight:800;text-align:center;color:#111;">${itemsSubtotal.toFixed(2)}</td>
                                </tr>
                                ${discountTotal > 0 ? `
                                <tr>
                                    <td style="border-top:1px solid #1565c0;border-right:1px solid #1565c0;padding:6px 4px;text-align:center;vertical-align:middle;">
                                        <div style="font-size:11px;font-weight:900;color:#111;">الخصم</div><div style="font-size:10px;font-weight:900;color:#111;">Discount</div>
                                    </td>
                                    <td style="border-top:1px solid #1565c0;padding:6px 10px;font-size:13px;font-weight:800;text-align:center;color:#111;">-${discountTotal.toFixed(2)}</td>
                                </tr>` : ``}
                                <tr>
                                    <td style="border-top:1px solid #1565c0;border-right:1px solid #1565c0;padding:6px 4px;text-align:center;vertical-align:middle;">
                                        <div style="font-size:11px;font-weight:900;color:#111;">ضريبة القيمة المضافة (5٪)</div><div style="font-size:10px;font-weight:900;color:#111;">VAT (5%)</div>
                                    </td>
                                    <td style="border-top:1px solid #1565c0;padding:6px 10px;font-size:13px;font-weight:800;text-align:center;color:#111;">${vatAmount.toFixed(2)}</td>
                                </tr>
                                ${deliveryAmount > 0 ? `
                                <tr>
                                    <td style="border-top:1px solid #1565c0;border-right:1px solid #1565c0;padding:6px 4px;text-align:center;vertical-align:middle;">
                                        <div style="font-size:11px;font-weight:900;color:#111;">رسوم التوصيل</div><div style="font-size:10px;font-weight:900;color:#111;">Delivery Charge</div>
                                    </td>
                                    <td style="border-top:1px solid #1565c0;padding:6px 10px;font-size:13px;font-weight:800;text-align:center;color:#111;">${deliveryAmount.toFixed(2)}</td>
                                </tr>` : ``}
                                <tr>
                                    <td style="border-top:1px solid #1565c0;border-right:1px solid #1565c0;padding:8px 4px;text-align:center;vertical-align:middle;">
                                        <div style="font-size:12px;font-weight:900;color:#111;">المجموع الإجمالي</div><div style="font-size:11px;font-weight:900;color:#111;">GRAND TOTAL</div>
                                    </td>
                                    <td style="border-top:1px solid #1565c0;padding:8px 10px;font-size:18px;font-weight:900;text-align:center;color:#111;">${grandTotal.toFixed(2)}</td>
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
                                    <img src="${qrB64}" style="width:40px;height:40px;border:1px solid #ccc;padding:2px;border-radius:3px;">
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
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAboSURBVFiFtZdtjB1VGcd/z5kzt3df2u72ZdstLW1h29IqFg0FQhTbUDH1hYRaLG3QFhKJRIkmKEqpBmOD9gPBmJjoBxAtaRAkGqwNaVIjQUX4YEuV7dIq3b5tW8tu9+3u3r0zcx4/nLlz79y7fNDESSZ35rz9//N//s9zzhXqLr17fXvkCl9QF3zCabjKabgwcXaWU2udWvwdUnu2OGdJGtvyY8vO2cEE26tqD9rJlmc/fPSu4SqmZOBbb7uDhOec2vlVkMQ1LdYEkB/TPDZJSda1/dtpeN8tb2w5mBHQL234JFN6gIpaYvyk5ol54NyY6Ul68Gnnx7GYz976+udfEX1g42wk+ReRziVSiEBj/GJNXxfWFs6BTwNcbXsfgonaSxNF02Np434imevjAKgiqpg4BiPIyjXYG9bB4qXQ0QGFIiBoNYIqKJK2Ca40hStVqJwdYvzN05SOnAcnqdiSwRhkQcuk7LCEsgmVFLxqCJBlPQQPPALXrOB/uVqBjntuZerkJQb2HKTcP4qmFEyVjOFO0V0bzxCxhEihohApLOqBR56C1jaYKKHHjuDefRc3PIorTaFqUA1wGqAxJJMxTiy0tKEEBN1dhCsW07JuJVIMceNT9H9lP+X+sUY/DFgKMg80VUBABHY+7MFP/AOe/C46OIKqzW6XmitpNlfuXTo76XpiB4VrF7Bo1yb6v7wfXH0CSqchkAJWIBQIgevWwrJVkMTw9A9hbAgjcd2dYCRBpmmrvrd/+ibmPXYPQVvI5R+8CArFVQtpW9udGyvEWEIJagYE1qzzBM+cgMEBTwwwUZIZTQAjgA29alGcxV7aWpj90BYQb9T39vyKqb6zzFi9hPYblzL51rmaEUWwhKn0VQN2Lfa/p/u8ItXQqCJxjGltI/jMVuRj65HuRQC48xeovPo65d8eJp4oEfWdIrxuOZW/9WEkIfrnADNWL6FwdSciMYJgEEQEi/WLe1oCszr98/gQvi/lqyDdVxN8ey90deccb67qprh9M4UNH2Xs8R8x8s29aKGdZCLGiCXuv+DHtRUw4pVEfXZawroUVIXA+lXLo5n8KFBsg0f3wvxuGDiLe/6XuN4+HBZdfT3htm2YRd3MfPzrjDz0PZKJcYz4tdyVEQCC9iJG4poHyRSgBmRSUFeuKaDApq0e/Mp7sPtBZHQC1IJa9E+DTB09RvHHT2G6u2i5ayMT+w9kniGe8phWUgJptiEY734hywRjUobqPRDi+26+3be//AuYGkdMks+K8StEL/wagML6W5C6TJGUAODHk7ZLjMXWGQ1qBExSUyCwMDeN+6neWmZUEuo2VLTvbd++aCEm1Cw7JI4yiY3EqQW8EW0tzmkxqq5npOaBpM5xllxoTJRKiuCkNtAQgxgvc1jFd6kykpZjMNg6+UMhK1WhqYXGJDDknUzPB/OhSeMqEhOsXuVxzg9gXKVWqKof4lxzUct5wAqZIwPjv7baf+wPvv1TX4TZs1LSKZEAzKxWgru3e8Fe+2MORAo+rKIujX+tGtpcsUnjBMCMggeuhubNl+CG26GzGx7+Cfz+59B3DCLg2uuRzfdDxxy4OIAeeCnLd0UwhSALQVYHsog2FBtcapjWmeRStDIB+3fDtj0w/yrYuZum6+J59IlHMeVxVGy69VIjEEe1OgCoSmMhAipXUgKd+UKkwMg5+NmDcNNm+NAGmL/EK3TpLPz1MBx4ERktIRKQiu5N2DXHL3NlOKsDimCMSHMhKp33z10rvQe0oT+ahNeeg8P7wAU+BOXInyVihVD8xpWdgsAsW+qnDwz4LEBSgqjxRqrLhKFjvmv+apjZmbqdfKZkRSsBE+fNWpcZRmLMgrkE624EwB090riFi8FKyS+QLjLSC8MnISjAx3dBx8LaWWE6IvVniQYiZuEC7GPfh8Di+o6jx//edHYQfetz7xDpyuw4Fim0LId1eyBsg6QCl/vg0jtQGoaJMZic9MUpwcsea/quYGZA+1xYvgbW3gxBAGOjxN/5Fsnpc/nTM+EF0be37CPSezPwKpGWZfCBr0JHT7Pb/5vrZC/60ydx/WemOd6HhywFOQTcm8sEgIl++Ms3oH0FzPsItC+BwmywLbWtu35O9S5PwsgQDJyGo2/AiePIlMOkZTl/qpKXRU/tLFIZ7yXS5UTkVWh8jmh4b+xXqPC+fZoE9X9qLhYnO3qMLH+2TGi+RijOm4xmt2eGqzNr4x6SvVPbJxr66rbwSExynxzaVzIAcs0LvyM02whl2E/4/xExklxGkzuLvzn4CtQXZUBPb++kVNlBzG1EyTymmEOsc4goEukMKto6vfxNoZmkomUiLVPRISIdJNZBKryKjZ6RZ/48VsX8D5388wZ7lLs0AAAAAElFTkSuQmCC" style="width:14px;height:14px;" alt="ig">
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

        // Wait for every image in the container to finish decoding before capturing.
        // All srcs are base64 data URIs at this point so this is typically instant.
        const invoiceImgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
        await Promise.all(invoiceImgs.map(img =>
            (img.complete && img.naturalWidth > 0)
                ? Promise.resolve()
                : new Promise<void>(res => {
                    img.addEventListener('load', () => res(), { once: true });
                    img.addEventListener('error', () => res(), { once: true });
                    setTimeout(res, 4000);
                })
        ));
        await new Promise(r => setTimeout(r, 100));

        const renderedHeight = container.firstElementChild ? (container.firstElementChild as HTMLElement).offsetHeight + 40 : 1250;

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

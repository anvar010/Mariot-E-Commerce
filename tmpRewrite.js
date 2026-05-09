const fs = require('fs');
const path = 'src/utils/pdfGenerator.ts';
let code = fs.readFileSync(path, 'utf8');

// The exact markers
const topMatch = `    // Fill minimum 15 rows so the table looks like the physical form`;
const bottomMatch = `    return pdf.output('datauristring');`;

const startIndex = code.indexOf(topMatch);
const endIndex = code.indexOf(bottomMatch) + bottomMatch.length;

if (startIndex === -1 || endIndex <= bottomMatch.length) {
    console.log('not found');
    process.exit(1);
}

const replacement = `
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();

    // Split items into chunks for pagination
    const ITEMS_PER_PAGE = 22; 
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
        const MIN_ROWS = 15;
        if (chunks.length === 1) {
            while (pageItems.length < MIN_ROWS) pageItems.push(null);
        }

        const itemRowsHTML = pageItems.map((item, idx) => {
            const isLastRow = idx === pageItems.length - 1;
            const btmBorder = isLastRow ? 'none' : '1px dotted #1565c0';

            if (!item) return \`
            <tr style="height:27px;">
                <td style="border-right:1px solid #1565c0;border-bottom:\${btmBorder};"></td>
                <td style="border-right:1px solid #1565c0;border-bottom:\${btmBorder};"></td>
                <td style="border-right:1px solid #1565c0;border-bottom:\${btmBorder};"></td>
                <td style="border-right:1px solid #1565c0;border-bottom:\${btmBorder};"></td>
                <td style="border-bottom:\${btmBorder};"></td>
            </tr>\`;

            const unitPrice = Number(item.price_at_purchase || item.price || 0);
            const lineTotal = unitPrice * (item.quantity || 1);
            return \`
            <tr style="height:27px; color:#111;">
                <td style="border-right:1px solid #1565c0;border-bottom:\${btmBorder};font-size:12px;font-weight:700;text-align:center;">\${(pageIndex * ITEMS_PER_PAGE) + idx + 1}</td>
                <td style="border-right:1px solid #1565c0;border-bottom:\${btmBorder};padding:0 10px;font-size:12px;font-weight:700;">\${item.name || ''}</td>
                <td style="border-right:1px solid #1565c0;border-bottom:\${btmBorder};font-size:12px;font-weight:700;text-align:center;">\${item.quantity || 1}</td>
                <td style="border-right:1px solid #1565c0;border-bottom:\${btmBorder};padding:0 10px;font-size:12px;font-weight:700;text-align:center;">\${unitPrice.toFixed(2)}</td>
                <td style="border-bottom:\${btmBorder};padding:0 10px;font-size:13px;font-weight:800;text-align:center;">\${lineTotal.toFixed(2)}</td>
            </tr>\`;
        }).join('');

        // Two rows of brand logos matching the physical invoice
        const brandRow1 = brandLogosB64.slice(0, 10).map(b64 => \`<img src="\${b64}" style="height:18px;max-width:52px;object-fit:contain;">\`).join('');
        const brandRow2 = brandLogosB64.slice(10).map(b64 => \`<img src="\${b64}" style="height:18px;max-width:52px;object-fit:contain;">\`).join('');

        const pageHtml = \`
        <div style="width:794px;min-height:1123px;background:#fff;padding:24px 28px 16px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;box-sizing:border-box;display:flex;flex-direction:column;position:relative;">
            
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:0;opacity:0.04;pointer-events:none;">
                <img src="\${faviconB64}" style="width:560px;height:auto;">
            </div>

            <div style="position:relative;z-index:1;display:flex;flex-direction:column;flex-grow:1;">
                <!-- Header -->
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <div style="flex:1;text-align:left;"><img src="\${mariotLogoEnB64}" style="height:72px;object-fit:contain;max-width:260px;"></div>
                    <div style="flex:0 0 auto;margin:0 20px;text-align:center;"><img src="\${faviconB64}" style="height:70px;width:70px;object-fit:contain;"></div>
                    <div style="flex:1;text-align:right;"><img src="\${mariotLogoArB64}" style="height:72px;object-fit:contain;max-width:260px;float:right;"></div>
                </div>

                <div style="margin-bottom:2px;">
                    <div style="display:flex;flex-wrap:nowrap;gap:6px;align-items:center;justify-content:flex-start;padding:3px 0;">\${brandRow1}</div>
                    <div style="display:flex;flex-wrap:nowrap;gap:6px;align-items:center;justify-content:flex-start;padding:3px 0;">\${brandRow2}</div>
                </div>

                <div style="border-top:1px solid #ccc;margin-bottom:8px;"></div>
                <div style="text-align:center;margin-bottom:10px;">
                    <div style="font-size:22px;font-weight:bold;color:#111;border-bottom:1px solid #111;display:inline-block;padding-bottom:2px;margin-bottom:3px;min-width:120px;">فاتورة</div>
                    <div style="font-size:19px;font-weight:900;color:#111;letter-spacing:2px;">INVOICE \${chunks.length > 1 ? \`(Page \${pageIndex + 1})\` : ''}</div>
                </div>

                <div style="font-size:19px;font-weight:900;color:#e91e63;font-style:italic;margin-bottom:10px;">NO: \${data.invoice_number}</div>

                <div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
                    <div style="display:flex;align-items:flex-end;gap:0;font-size:15px;font-weight:bold;color:#111;width:55%;">
                        <span style="white-space:nowrap;">Date</span>
                        <span style="flex:1;border-bottom:2px dotted #333;margin:0 8px 3px;text-align:center;font-size:13px;">\${invoiceDate}</span>
                        <span style="white-space:nowrap;font-size:16px;direction:rtl;">تاريخ</span>
                    </div>
                </div>
                <div style="display:flex;align-items:flex-end;margin-bottom:8px;font-size:14px;font-weight:bold;color:#111;">
                    <span style="white-space:nowrap;">Mr./M/s.</span>
                    <span style="flex:1;border-bottom:2px dotted #333;margin:0 8px 3px;text-align:center;font-size:13px;">\${data.customer_name || ''}</span>
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
                                \${itemRowsHTML}
                            </tbody>
                            \${isLastPage ? \`
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
                                    <td style="border-top:1px solid #1565c0;padding:8px 10px;font-size:16px;font-weight:800;text-align:center;color:#111;">\${Number(data.final_amount).toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td colspan="3" style="border-top:1px solid #1565c0;border-right:1px solid #1565c0;padding:10px 14px;"></td>
                                    <td style="border-top:1px solid #1565c0;border-right:1px solid #1565c0;padding:8px 4px;text-align:center;vertical-align:middle;">
                                        <div style="font-size:12px;font-weight:900;color:#111;">المجموع الإجمالي</div><div style="font-size:11px;font-weight:900;color:#111;">GRAND TOTAL</div>
                                    </td>
                                    <td style="border-top:1px solid #1565c0;padding:8px 10px;font-size:18px;font-weight:900;text-align:center;color:#111;">\${Number(data.final_amount).toFixed(2)}</td>
                                </tr>
                            </tfoot>\` : \`\`}
                        </table>
                    </div>
                </div>

                \${isLastPage ? \`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px 30px;font-size:13px;font-weight:700;color:#333;">
                    <span>Sale sign :</span><span>توقيع البائع :</span><span>Received By :</span><span style="direction:rtl;">تم الاستلام بواسطة :</span>
                </div>\` : \`\`}
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
                                <img src="\${isoB64}" style="height:38px;max-width:42px;object-fit:contain;" alt="ISO">
                                <img src="\${icvB64}" style="height:34px;max-width:42px;object-fit:contain;" alt="ICV">
                                <img src="\${qaB64}" style="height:30px;max-width:38px;object-fit:contain;" alt="QA">
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
                    <img src="https://cdn-icons-png.flaticon.com/32/145/145802.png" style="width:14px;height:14px;" alt="fb">
                    <img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" style="width:14px;height:14px;" alt="ig">
                    <img src="https://cdn-icons-png.flaticon.com/32/3128/3128304.png" style="width:14px;height:14px;" alt="yt">
                    <img src="https://cdn-icons-png.flaticon.com/32/145/145808.png" style="width:14px;height:14px;" alt="tw">
                    <img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" style="width:14px;height:14px;" alt="wa">
                    <img src="https://cdn-icons-png.flaticon.com/32/3536/3536505.png" style="width:14px;height:14px;" alt="li">
                    <span style="font-size:11px;color:#111;margin-left:5px;font-weight:900;">@Mariot kitchen equipment</span>
                </div>
                <div style="font-size:11.5px;color:#111;font-weight:800;display:flex;gap:28px;">
                    <span>www.mariotstore.com</span><span>www.mariot-group.com</span>
                </div>
            </div>
        </div>\`;

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
`;

const newCode = code.substring(0, startIndex) + replacement + code.substring(endIndex);
fs.writeFileSync(path, newCode);
console.log('Successfully updated pdfGenerator.ts');

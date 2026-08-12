/**
 * DHL Express — MyDHL API, Rating endpoint.
 *
 * Credentials come from the environment; they are never committed:
 *   DHL_API_KEY, DHL_API_SECRET, DHL_ACCOUNT_NUMBER
 *   DHL_API_BASE            (default: sandbox — point at production when tested)
 *   SHIP_FROM_COUNTRY, SHIP_FROM_CITY, SHIP_FROM_POSTAL_CODE
 *
 * NOTE: the request/response shape below follows DHL's published Rating contract but has NOT
 * been validated against a live account. Verify against the sandbox before going live; if the
 * shape differs, the change is contained to this file.
 */

const name = 'DHL';

const BASE_URL = process.env.DHL_API_BASE || 'https://express.api.dhl.com/mydhlapi/test';

const isConfigured = () => Boolean(
    process.env.DHL_API_KEY && process.env.DHL_API_SECRET && process.env.DHL_ACCOUNT_NUMBER
);

// DHL wants a shipping date, not "now" — it prices by the day the parcel is handed over.
// Tomorrow avoids same-day cut-off rejections.
const nextShippingDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return `${date.toISOString().split('T')[0]}T10:00:00 GMT+04:00`;
};

const quote = async ({ weightKg, destination }) => {
    const auth = Buffer.from(`${process.env.DHL_API_KEY}:${process.env.DHL_API_SECRET}`).toString('base64');

    const body = {
        customerDetails: {
            shipperDetails: {
                postalCode: process.env.SHIP_FROM_POSTAL_CODE || '00000',
                cityName: process.env.SHIP_FROM_CITY || 'Dubai',
                countryCode: process.env.SHIP_FROM_COUNTRY || 'AE',
            },
            receiverDetails: {
                postalCode: destination.zip_code || '00000',
                cityName: destination.city || '',
                countryCode: String(destination.country).toUpperCase().slice(0, 2),
            },
        },
        accounts: [{ typeCode: 'shipper', number: process.env.DHL_ACCOUNT_NUMBER }],
        plannedShippingDateAndTime: nextShippingDate(),
        unitOfMeasurement: 'metric',
        isCustomsDeclarable: String(destination.country).toUpperCase() !== (process.env.SHIP_FROM_COUNTRY || 'AE'),
        packages: [{ weight: Number(weightKg.toFixed(3)), dimensions: { length: 40, width: 40, height: 40 } }],
    };

    const response = await fetch(`${BASE_URL}/rates`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`DHL rating failed (${response.status}): ${detail.slice(0, 200)}`);
    }

    const data = await response.json();

    return (data.products || []).map(product => {
        // Prefer the billing currency total; DHL returns several price breakdowns.
        const priced = (product.totalPrice || []).find(p => p.currencyType === 'BILLC')
            || (product.totalPrice || [])[0];
        const days = product.deliveryCapabilities?.totalTransitDays;

        return {
            code: `dhl_${product.productCode}`.toLowerCase(),
            carrier: 'DHL',
            label: product.productName || 'DHL Express',
            label_ar: 'دي إتش إل إكسبريس',
            min_days: days ? Number(days) : null,
            max_days: days ? Number(days) : null,
            price: Number(priced?.price || 0),
            currency: priced?.priceCurrency || 'AED',
        };
    }).filter(method => method.price > 0);
};

module.exports = { name, isConfigured, quote };

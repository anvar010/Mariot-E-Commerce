/**
 * Aramex — Rate Calculator API.
 *
 * Built against the official artefacts (Shipping Services API manual, the WSDL, and the PHP
 * sample client), not guesswork:
 *   - RateCalculatorRequest = ClientInfo, Transaction, OriginAddress, DestinationAddress,
 *     ShipmentDetails. ClientInfo has exactly seven fields; there is no "Source".
 *   - RateCalculatorResponse returns a SINGLE TotalAmount, so each service level needs its
 *     own call. That is why the product types are quoted in parallel below.
 *   - Product types are Appendix A of the manual. PPX/EPX are the international
 *     Priority/Economy parcel services, i.e. the "Express vs Economy" choice at checkout.
 *   - Payment type "P" (Prepaid, charges payable by shipper) is Appendix B.
 *
 * Credentials come from the environment and are never committed:
 *   ARAMEX_USERNAME, ARAMEX_PASSWORD, ARAMEX_ACCOUNT_NUMBER,
 *   ARAMEX_ACCOUNT_PIN, ARAMEX_ACCOUNT_ENTITY, ARAMEX_ACCOUNT_COUNTRY_CODE
 *   ARAMEX_RATE_URL, ARAMEX_EXPRESS_PRODUCT_TYPES, ARAMEX_DOMESTIC_PRODUCT_TYPES
 */

const name = 'Aramex';

const RATE_URL = process.env.ARAMEX_RATE_URL
    || 'https://ws.dev.aramex.net/ShippingAPI.V2/RateCalculator/Service_1_0.svc/json/CalculateRate';

// Appendix A. Only the parcel services are useful here: the Document types (PDX/DDX/GDX)
// are for printed matter, and PLX is capped at 0.5kg.
const PRODUCT_TYPES = {
    PPX: { label: 'Priority Parcel Express', label_ar: 'طرد بريوريتي إكسبريس', min_days: 2, max_days: 4 },
    DPX: { label: 'Deferred Parcel Express', label_ar: 'طرد مؤجل إكسبريس', min_days: 3, max_days: 5 },
    GPX: { label: 'Ground Parcel Express', label_ar: 'طرد أرضي إكسبريس', min_days: 5, max_days: 10 },
    EPX: { label: 'Economy Parcel Express', label_ar: 'طرد اقتصادي إكسبريس', min_days: 6, max_days: 12 },
};

const listFromEnv = (value, fallback) =>
    (value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : fallback);

const isConfigured = () => Boolean(
    process.env.ARAMEX_USERNAME && process.env.ARAMEX_PASSWORD
    && process.env.ARAMEX_ACCOUNT_NUMBER && process.env.ARAMEX_ACCOUNT_PIN
);

// Exactly the seven fields in the WSDL's ClientInfo sequence.
const clientInfo = () => ({
    UserName: process.env.ARAMEX_USERNAME,
    Password: process.env.ARAMEX_PASSWORD,
    Version: 'v1.0',
    AccountNumber: process.env.ARAMEX_ACCOUNT_NUMBER,
    AccountPin: process.env.ARAMEX_ACCOUNT_PIN,
    AccountEntity: process.env.ARAMEX_ACCOUNT_ENTITY || 'DXB',
    AccountCountryCode: process.env.ARAMEX_ACCOUNT_COUNTRY_CODE || 'AE',
});

/** One CalculateRate call. Returns null when Aramex declines to serve this lane. */
const quoteProductType = async ({ weightKg, destination, productGroup, productType }) => {
    const weight = { Value: Number(weightKg.toFixed(3)), Unit: 'KG' };

    const body = {
        ClientInfo: clientInfo(),
        Transaction: { Reference1: `mariot-${productType}` },
        OriginAddress: {
            City: process.env.SHIP_FROM_CITY || 'Dubai',
            CountryCode: (process.env.SHIP_FROM_COUNTRY || 'AE').toUpperCase(),
            PostCode: process.env.SHIP_FROM_POSTAL_CODE || '',
        },
        DestinationAddress: {
            City: destination.city || '',
            CountryCode: String(destination.country).toUpperCase().slice(0, 2),
            PostCode: destination.zip_code || '',
        },
        ShipmentDetails: {
            PaymentType: 'P',
            ProductGroup: productGroup,
            ProductType: productType,
            ActualWeight: weight,
            ChargeableWeight: weight,
            NumberOfPieces: 1,
        },
    };

    const response = await fetch(RATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Aramex ${productType} HTTP ${response.status}: ${detail.slice(0, 200)}`);
    }

    const data = await response.json();

    // Aramex reports business failures inside a 200 response. A service simply not being
    // offered on this lane (e.g. ERR52) is normal, so it drops the option rather than
    // failing the whole quote.
    if (data.HasErrors) {
        const message = (data.Notifications || []).map(n => `${n.Code}: ${n.Message}`).join('; ');
        console.warn(`[shipping] Aramex ${productType} unavailable — ${message || 'unspecified'}`);
        return null;
    }

    const amount = Number(data.TotalAmount?.Value || 0);
    if (!amount) return null;

    const meta = PRODUCT_TYPES[productType] || { label: `Aramex ${productType}` };
    return {
        code: `aramex_${productType}`.toLowerCase(),
        carrier: 'Aramex',
        label: meta.label,
        label_ar: meta.label_ar || meta.label,
        min_days: meta.min_days ?? null,
        max_days: meta.max_days ?? null,
        price: amount,
        currency: data.TotalAmount?.CurrencyCode || 'AED',
    };
};

const quote = async ({ weightKg, destination }) => {
    const originCountry = (process.env.SHIP_FROM_COUNTRY || 'AE').toUpperCase();
    const destinationCountry = String(destination.country).toUpperCase().slice(0, 2);
    const isDomestic = originCountry === destinationCountry;

    // Appendix A documents the international (EXP) types only; the domestic codes are
    // account-specific, so they stay configurable rather than guessed.
    const productGroup = isDomestic ? 'DOM' : 'EXP';
    const productTypes = isDomestic
        ? listFromEnv(process.env.ARAMEX_DOMESTIC_PRODUCT_TYPES, ['ONP'])
        : listFromEnv(process.env.ARAMEX_EXPRESS_PRODUCT_TYPES, ['PPX', 'EPX']);

    // One call per service level, in parallel — a rejected lane must not lose the others.
    const settled = await Promise.allSettled(productTypes.map(productType =>
        quoteProductType({ weightKg, destination, productGroup, productType })
    ));

    const methods = [];
    settled.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) methods.push(result.value);
        else if (result.status === 'rejected') {
            console.error(`[shipping] Aramex ${productTypes[index]} failed:`, result.reason?.message);
        }
    });

    return methods;
};

module.exports = { name, isConfigured, quote, PRODUCT_TYPES };

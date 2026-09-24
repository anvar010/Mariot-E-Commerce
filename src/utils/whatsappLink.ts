/**
 * wa.me link for a stored phone number.
 *
 * wa.me wants the country code with no leading zero, and numbers reach us written several
 * ways: "0509995446" as dialled locally, "+971509995446" from the validated field, or
 * bare digits from an older record.
 *
 * A number that already carries a country code is passed through rather than guessed at.
 * Only a bare local number gets the UAE code, because that is the single case where the
 * country is not in doubt -- a local number stored without one was entered by someone
 * standing in the UAE.
 *
 * Returns null when there are too few digits to be a real number, so callers can offer
 * nothing rather than open a chat with a broken recipient.
 */
export const whatsappLink = (phone?: string): string | null => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 7) return null;
    const intl = digits.startsWith('971') ? digits
        : digits.startsWith('0') ? `971${digits.slice(1)}`
            : digits;
    return `https://wa.me/${intl}`;
};

// The storefront URL used in every customer-facing link we send out.
//
// FRONTEND_URL is still set to the old uae.mariotstore.com on some deployments, so order
// confirmations, invoices and password-reset links were pointing at a host the shop no
// longer trades under. Those links live in inboxes for months, so getting them right
// matters more than most config: a reset link is useless if it lands on the wrong host.
//
// Rather than trusting the variable, the legacy host is rewritten to the canonical one
// here. Setting FRONTEND_URL correctly is still the right fix -- this makes the emails
// correct in the meantime, and keeps a stale value from being able to break them again.
const CANONICAL = 'https://mariotstore.com';

// Anything on the old host maps to the new one. Localhost and any other value are left
// alone so development still points at the machine it is running on.
const LEGACY_HOSTS = ['uae.mariotstore.com'];

const siteUrl = () => {
    const raw = (process.env.FRONTEND_URL || CANONICAL).trim().replace(/\/+$/, '');
    try {
        const url = new URL(raw);
        if (LEGACY_HOSTS.includes(url.hostname.toLowerCase())) return CANONICAL;
        return url.origin;
    } catch {
        // Not a parseable URL -- fall back rather than emit a broken link.
        return CANONICAL;
    }
};

module.exports = { siteUrl, CANONICAL_SITE_URL: CANONICAL };

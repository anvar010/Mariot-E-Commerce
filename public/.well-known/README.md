# Apple Pay domain verification

**Nothing needs to be placed in this directory.** It is kept only so the answer
is written down somewhere findable.

Older Stripe integrations required the merchant to host a file at
`/.well-known/apple-developer-merchantid-domain-association`. That is no longer
how this account works: registering the domain under **Settings → Payments →
Payment method domains** is enough, and Stripe registers it with Apple on our
behalf. Verified against the API on 29 Aug 2026 — `apple_pay: active` for
`uae.mariotstore.com` while that path returned a 404, which settles it.

## What actually matters: modes do not cross

A payment method domain registered in **live mode is invisible in test mode**,
and the reverse. The wallet button then renders nothing at all, with no error to
explain why — the browser is told no wallet is available, and that is the end of
it.

So the domain has to be registered **twice**: once in test mode, once in live.

Check which modes a domain is good for:

    # answers for whichever mode the key belongs to
    node -e "require('stripe')('sk_...').paymentMethodDomains.list({domain_name:'uae.mariotstore.com'}).then(r=>console.log(JSON.stringify(r.data,null,2)))"

Look for `apple_pay.status` and `google_pay.status` — both should read `active`.
`status_details.error_message` says what is wrong when they do not.

## If the wallet button never appears

In the order worth checking:

1. **Mode mismatch** — the cause above, and by far the most likely one.
2. `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` missing from the deploy. It is baked in at
   build time, so setting it needs a rebuild, not a restart. The component
   returns `null` without it.
3. Order total under about 2 AED, below Stripe's minimum charge — the button is
   deliberately not offered.
4. No wallet on the device. Apple Pay needs Safari and a card in Wallet; Google
   Pay needs Chrome and a card on the Google account. Firefox shows neither.
   A blank space on a Windows desktop is expected, not a bug.

Google Pay needs no domain step in either mode beyond the registration above.

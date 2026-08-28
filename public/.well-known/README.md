# Apple Pay domain verification

Apple Pay will not appear on the site until this domain is verified, and it
fails **silently** — no console error, no message, the button simply never
renders. If Apple Pay is missing, check this first.

## What to do

1. Stripe Dashboard → **Settings → Payments → Payment method domains**
2. **Add a new domain** → `uae.mariotstore.com`
3. Download the file Stripe offers: `apple-developer-merchantid-domain-association`
   (no file extension — keep it exactly as given)
4. Drop it in **this directory**, next to this README
5. Rebuild and deploy the frontend
6. Back in the Dashboard, press **Verify**

Confirm it is being served before verifying:

    curl -i https://uae.mariotstore.com/.well-known/apple-developer-merchantid-domain-association

You want `200` and a body of plain text. A `404` means the file did not make it
into the deployed build.

## Do it twice

Payment method domains are per-mode. A domain verified in **test mode** is not
verified in **live mode**, and vice versa. Register the domain in whichever mode
you are running, and again when you switch.

## Google Pay

Nothing to do — Google Pay needs no domain verification. It works as soon as it
is enabled on the Stripe account.

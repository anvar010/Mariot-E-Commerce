'use client';

/**
 * Apple Pay / Google Pay button.
 *
 * Renders in its own <Elements> group, deliberately. The group runs in deferred
 * mode ("here is the amount, the PaymentIntent comes later"), because the order
 * is only created on our server once the shopper has actually confirmed in the
 * wallet sheet — there is no client_secret to hand over at mount time. The card
 * form on the same page uses a different, non-deferred group, and keeping the two
 * apart means adding wallets cannot disturb a card flow that already works.
 *
 * Samsung Pay is not here because Stripe does not offer it as a wallet button —
 * applePay, googlePay and amazonPay are the only ones the SDK exposes. Samsung
 * devices get the Google Pay button, which is what they use in Chrome anyway.
 *
 * The element renders nothing where no wallet is supported at all (Firefox, for
 * one), and the heading and divider around it appear only once a button has
 * actually been drawn, so the band collapses instead of framing empty space.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Elements, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import styles from './WalletExpressCheckout.module.css';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '');

// Stripe rejects charges below roughly 2 AED. Below that the element would mount
// only to fail on confirm, so it is not offered at all.
const MIN_AED = 2;

export interface WalletCheckoutProps {
    /** Order total in AED (major units). */
    amount: number;
    /**
     * Runs before the wallet sheet opens. Return an error message to block it —
     * a shopper who has not chosen a delivery method cannot be charged yet.
     */
    validate?: () => string | null;
    /** Creates the order server-side and returns its PaymentIntent secret. */
    onCreateOrder: () => Promise<{ clientSecret: string; orderId: number | string }>;
    onSuccess: (orderId: number | string) => void;
    onError: (message: string) => void;
    /** Shown above the button, e.g. "Express checkout". */
    heading?: string;
    /** Divider text between the wallet button and the normal payment options. */
    dividerText?: string;
    isRtl?: boolean;
}

const WalletInner: React.FC<WalletCheckoutProps> = ({
    validate, onCreateOrder, onSuccess, onError, heading, dividerText, isRtl,
}) => {
    const stripe = useStripe();
    const elements = useElements();
    // Whether Stripe actually drew a button, measured rather than inferred.
    //
    // onReady's availablePaymentMethods is a report, not the outcome: with
    // googlePay: 'always' Stripe may render a button while still reporting the
    // method unavailable, and gating the layout on that report would hide the very
    // button 'always' exists to force. Watching the box's height asks the question
    // that actually matters — is there something in there — and needs no
    // assumptions about how Stripe fills the report in.
    const [hasButton, setHasButton] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const box = boxRef.current;
        if (!box || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => setHasButton(box.offsetHeight > 0));
        ro.observe(box);
        return () => ro.disconnect();
    }, []);

    const handleConfirm = async () => {
        if (!stripe || !elements) return;

        try {
            // Deferred mode requires submit() before the PaymentIntent is confirmed;
            // it is what validates and tokenises what the wallet returned.
            const { error: submitError } = await elements.submit();
            if (submitError) {
                onError(submitError.message || 'Payment could not be completed.');
                return;
            }

            const { clientSecret, orderId } = await onCreateOrder();

            const { error } = await stripe.confirmPayment({
                elements,
                clientSecret,
                confirmParams: {
                    // Only used by methods that bounce through a bank page; card
                    // wallets settle inline and never reach it.
                    return_url: `${window.location.origin}${window.location.pathname.replace(/\/checkout$/, '')}/checkoutsuccess?orderId=${orderId}`,
                },
                redirect: 'if_required',
            });

            if (error) {
                onError(error.message || 'Payment could not be completed.');
                return;
            }

            onSuccess(orderId);
        } catch (e: any) {
            onError(e?.message || 'Payment could not be completed.');
        }
    };

    return (
        <div className={styles.wrap} dir={isRtl ? 'rtl' : 'ltr'}>
            {heading && hasButton && <span className={styles.heading}>{heading}</span>}

            {/* Always mounted at full width. An earlier version parked the element in
                a 1px clipped box until onReady confirmed a wallet, but Stripe sizes
                these buttons from their container, and at 1px wide Google Pay never
                laid out — Apple Pay happened to survive it, which is exactly why the
                bug looked like "Android is broken". The element draws nothing until
                it is ready, so there is nothing to hide in the first place. */}
            <div className={styles.buttonBox} ref={boxRef}>
                <ExpressCheckoutElement
                    options={{
                        buttonHeight: 46,
                        // Only the wallets that make sense for this store. Link and
                        // Amazon Pay are not enabled on the account.
                        //
                        // googlePay is 'always' rather than 'auto' on purpose. Under
                        // 'auto', Chrome on Android reports no payment method until the
                        // shopper already has a card in Google Wallet, and Stripe then
                        // hides the button entirely — which is why it appeared on desktop
                        // Chrome, which is more permissive, and never on the phone.
                        // 'always' shows the button and lets Google Pay handle a shopper
                        // with no card saved yet. It does not override browser support:
                        // Safari still gets Apple Pay only, and Firefox still gets neither.
                        paymentMethods: { applePay: 'auto', googlePay: 'always', amazonPay: 'never', link: 'never' },
                    }}
                    onReady={({ availablePaymentMethods }) => {
                        // "The button isn't showing" is otherwise unanswerable: the
                        // browser decides silently and a missing button looks identical
                        // whether the cause is a device with no saved card, the wrong
                        // Stripe mode, or an unregistered domain. This says which.
                        //
                        // warn rather than info: console filters hide info by default in
                        // some setups, and a diagnostic nobody sees is not a diagnostic.
                        const keyMode = (process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '').startsWith('pk_live_') ? 'live' : 'test';
                        if (!availablePaymentMethods || Object.keys(availablePaymentMethods).length === 0) {
                            console.warn(`[wallet] the browser reports NO wallet available (Stripe key: ${keyMode} mode).`
                                + ' Apple Pay needs Safari with a card in Wallet; Google Pay needs Chrome.'
                                + ' If both should work, check the domain is registered in THIS mode:'
                                + ' Stripe Dashboard -> Settings -> Payment method domains.');
                        } else {
                            console.warn('[wallet] available:', availablePaymentMethods, `(Stripe key: ${keyMode} mode)`);
                        }
                    }}
                    onLoadError={({ error }) => {
                        console.error('[wallet] Express checkout failed to load:', error?.message || error);
                    }}
                    onClick={({ resolve, reject }) => {
                        const problem = validate?.();
                        if (problem) {
                            onError(problem);
                            reject();
                            return;
                        }
                        resolve();
                    }}
                    onConfirm={handleConfirm}
                    onCancel={() => { /* shopper dismissed the sheet — nothing to do */ }}
                />
            </div>

            {hasButton && dividerText && (
                <div className={styles.divider}><span>{dividerText}</span></div>
            )}
        </div>
    );
};

const WalletExpressCheckout: React.FC<WalletCheckoutProps> = (props) => {
    // Both of these render nothing, which is indistinguishable from "the browser has no
    // wallet" unless it is said out loud. Without them, "the button isn't showing" has
    // three silent causes and no way to tell them apart from the outside.
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY) {
        console.warn('[wallet] not rendered: NEXT_PUBLIC_STRIPE_PUBLIC_KEY is missing from this build');
        return null;
    }
    if (!Number.isFinite(props.amount) || props.amount < MIN_AED) {
        console.warn(`[wallet] not rendered: order total ${props.amount} is below the ${MIN_AED} AED minimum`);
        return null;
    }

    return (
        <Elements
            stripe={stripePromise}
            options={{
                mode: 'payment',
                // Stripe works in the smallest unit — fils, not dirhams.
                amount: Math.round(props.amount * 100),
                currency: 'aed',
                // react-stripe-js forwards later option changes to elements.update(),
                // so the amount tracks the cart as coupons and shipping move it.
                appearance: { theme: 'stripe', variables: { borderRadius: '10px' } },
            }}
        >
            <WalletInner {...props} />
        </Elements>
    );
};

export default WalletExpressCheckout;

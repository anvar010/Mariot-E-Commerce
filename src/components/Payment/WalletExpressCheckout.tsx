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
 * The element renders nothing at all when the visitor has no usable wallet
 * (Firefox, a desktop with no saved card, Safari without an Apple Pay card), so
 * the whole band hides itself rather than showing a button that cannot work.
 */
import React, { useState } from 'react';
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
    const [available, setAvailable] = useState<boolean | null>(null);

    // onReady reports which wallets the browser can actually offer. null means we
    // have not heard yet, false means none — either way, render nothing.
    if (available === false) return null;

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
            {heading && available && <span className={styles.heading}>{heading}</span>}

            <div className={available ? styles.buttonBox : styles.hidden}>
                <ExpressCheckoutElement
                    options={{
                        buttonHeight: 46,
                        // Only the wallets that make sense for this store. Link and
                        // Amazon Pay are not enabled on the account.
                        paymentMethods: { applePay: 'auto', googlePay: 'auto', amazonPay: 'never', link: 'never' },
                    }}
                    onReady={({ availablePaymentMethods }) => {
                        setAvailable(!!availablePaymentMethods && Object.keys(availablePaymentMethods).length > 0);
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

            {available && dividerText && (
                <div className={styles.divider}><span>{dividerText}</span></div>
            )}
        </div>
    );
};

const WalletExpressCheckout: React.FC<WalletCheckoutProps> = (props) => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY) return null;
    if (!Number.isFinite(props.amount) || props.amount < MIN_AED) return null;

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

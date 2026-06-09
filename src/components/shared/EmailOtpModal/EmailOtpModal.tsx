'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Mail, Lightbulb, Check } from 'lucide-react';
import { useLocale } from 'next-intl';
import { API_BASE_URL } from '@/config';
import styles from './EmailOtpModal.module.css';

type Mode = 'signup' | 'profile-email';

interface BaseProps {
    open: boolean;
    mode: Mode;
    onClose: () => void;
    /** Called with the response payload when OTP is successfully verified. */
    onVerified: (data: any) => void;
}

interface SignupProps extends BaseProps {
    mode: 'signup';
    /** Initial form data. Used for "resend OTP" requests. */
    signupData: { name: string; email: string; password: string };
    onChangeEmail?: () => void;
}

interface ProfileEmailProps extends BaseProps {
    mode: 'profile-email';
    newEmail: string;
    onChangeEmail?: () => void;
}

type Props = SignupProps | ProfileEmailProps;

function maskEmail(email: string) {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = local.slice(0, Math.min(3, local.length));
    return `${visible}${'.'.repeat(3)}@${domain}`;
}

const EmailOtpModal: React.FC<Props> = (props) => {
    const { open, mode, onClose, onVerified } = props;
    const isArabic = useLocale() === 'ar';
    const targetEmail = mode === 'signup' ? props.signupData.email : props.newEmail;

    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [resendIn, setResendIn] = useState(0);
    const [verified, setVerified] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const autoSentRef = useRef(false);

    useEffect(() => {
        if (!open) {
            setOtp(['', '', '', '', '', '']);
            setError(null);
            setResendIn(0);
            setVerified(false);
            autoSentRef.current = false;
            return;
        }
        // For signup, AuthForm already sent the OTP before opening — don't double-send.
        // For profile-email, send once on open (strict-mode guarded).
        if (mode === 'profile-email' && !autoSentRef.current) {
            autoSentRef.current = true;
            void sendOtp();
        } else if (mode === 'signup') {
            // Start the resend cooldown matching the just-sent code from AuthForm.
            setResendIn(45);
        }
        // Focus first box.
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setInterval(() => setResendIn(s => s - 1), 1000);
        return () => clearInterval(t);
    }, [resendIn]);

    const handleOtpChange = (value: string, index: number) => {
        if (value && !/^\d$/.test(value.slice(-1))) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (error) setError(null);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'Enter' && otp.every(d => d !== '')) {
            void verifyOtp(otp.join(''));
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const data = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
        if (data.length === 6) {
            setOtp(data);
            inputRefs.current[5]?.focus();
            if (error) setError(null);
        }
    };

    const sendOtp = async () => {
        if (sending) return;
        setSending(true);
        setError(null);
        try {
            const url = mode === 'signup'
                ? `${API_BASE_URL}/verify/signup/send-otp`
                : `${API_BASE_URL}/verify/email/send-otp`;
            const body = mode === 'signup'
                ? props.signupData
                : { email: targetEmail };

            const res = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'x-locale': isArabic ? 'ar' : 'en' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.message || (isArabic ? 'فشل إرسال الرمز' : 'Failed to send code'));
                return;
            }
            setResendIn(45);
        } catch {
            setError(isArabic ? 'خطأ في الشبكة. حاول مرة أخرى.' : 'Network error. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const verifyOtp = async (code: string) => {
        if (loading || verified) return;
        if (code.length < 6) {
            setError(isArabic ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter the 6-digit code');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const url = mode === 'signup'
                ? `${API_BASE_URL}/verify/signup/verify-otp`
                : `${API_BASE_URL}/verify/email/verify-otp`;
            const body = mode === 'signup'
                ? { email: targetEmail, code }
                : { code };

            const res = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'x-locale': isArabic ? 'ar' : 'en' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                const invalidMsg = isArabic ? 'رمز غير صحيح' : 'Invalid code';
                setError(data.message?.toLowerCase().includes('invalid') ? invalidMsg : (data.message || invalidMsg));
                return;
            }
            setVerified(true);
            // Brief success state so user sees the confirmation, then hand off.
            setTimeout(() => onVerified(data), 1100);
        } catch {
            setError(isArabic ? 'خطأ في الشبكة. حاول مرة أخرى.' : 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    const ctaLabel = mode === 'signup'
        ? (isArabic ? 'إنشاء حساب' : 'SIGN UP')
        : (isArabic ? 'تأكيد البريد' : 'VERIFY EMAIL');
    const hasError = !!error;

    return (
        <div className={styles.overlay} onClick={verified ? undefined : onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                {!verified && (
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                )}

                {verified ? (
                    <div className={styles.successWrap}>
                        <div className={styles.successCircle}>
                            <Check size={36} strokeWidth={3} />
                        </div>
                        <h3 className={styles.successTitle}>{isArabic ? 'تم التحقق من الرمز بنجاح' : 'OTP verified successfully'}</h3>
                        <p className={styles.successSub}>{isArabic ? 'جارٍ التحويل…' : 'Redirecting…'}</p>
                    </div>
                ) : (
                    <>
                        <p className={styles.heading}>{isArabic ? 'أدخل الرمز المكون من 6 أرقام المُرسل إلى' : 'Enter the 6-digit OTP sent to'}</p>
                        <div className={styles.emailLine}>
                            <Mail size={18} className={styles.envelope} />
                            <span>{maskEmail(targetEmail)}</span>
                            {props.onChangeEmail && (
                                <button type="button" className={styles.changeBtn} onClick={() => { onClose(); props.onChangeEmail?.(); }}>
                                    {isArabic ? 'تغيير' : 'Change'}
                                </button>
                            )}
                        </div>

                        <div className={styles.otpContainer} onPaste={handlePaste}>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={el => { inputRefs.current[index] = el; }}
                                    className={`${styles.otpInput} ${hasError ? styles.otpInputError : ''}`}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    spellCheck={false}
                                    disabled={loading}
                                    onChange={e => handleOtpChange(e.target.value, index)}
                                    onKeyDown={e => handleKeyDown(e, index)}
                                />
                            ))}
                        </div>

                        {hasError && <div className={styles.inlineError}>{error}</div>}

                        <div className={styles.resendWrap}>
                            <div className={styles.resendLabel}>{isArabic ? 'لم تستلم الرمز؟' : "Didn't get the OTP?"}</div>
                            <button type="button" className={styles.resendBtn} onClick={sendOtp} disabled={resendIn > 0 || sending || loading}>
                                {resendIn > 0
                                    ? (isArabic ? `إعادة الإرسال خلال ${resendIn} ثانية` : `Resend OTP via email in ${resendIn}s`)
                                    : (sending ? (isArabic ? 'جارٍ الإرسال…' : 'Sending…') : (isArabic ? 'إعادة إرسال الرمز عبر البريد' : 'Resend OTP via email'))}
                            </button>
                        </div>

                        <div className={styles.infoBanner}>
                            <Lightbulb size={16} style={{ flexShrink: 0, marginTop: 1, color: '#ca8a04' }} />
                            <span>{isArabic ? 'يحمي التحقق بالرمز حسابك من الوصول غير المصرح به.' : 'OTP verification protects your account from unauthorized access.'}</span>
                        </div>

                        <button
                            type="button"
                            className={styles.primaryBtn}
                            onClick={() => verifyOtp(otp.join(''))}
                            disabled={loading || otp.some(d => d === '')}
                        >
                            {loading && <span className={styles.loader}></span>}
                            {loading ? (isArabic ? 'جارٍ التحقق…' : 'Verifying…') : ctaLabel}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default EmailOtpModal;

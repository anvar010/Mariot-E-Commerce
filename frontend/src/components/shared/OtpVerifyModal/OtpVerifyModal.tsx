'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, MessageCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '@/config';
import styles from './OtpVerifyModal.module.css';

interface Props {
    open: boolean;
    onClose: () => void;
    onVerified: () => void;
    phoneNumber?: string;
    title?: string;
    description?: string;
}

const OtpVerifyModal: React.FC<Props> = ({ open, onClose, onVerified, phoneNumber, title, description }) => {
    const [stage, setStage] = useState<'send' | 'verify'>('send');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
    const [resendIn, setResendIn] = useState(0);
    const [inputPhone, setInputPhone] = useState('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!open) {
            setStage('send');
            setOtp(['', '', '', '', '', '']);
            setError(null);
            setMaskedPhone(null);
            setResendIn(0);
            setInputPhone('');
        }
    }, [open]);

    useEffect(() => {
        if (resendIn <= 0) return;
        const t = setInterval(() => setResendIn(s => s - 1), 1000);
        return () => clearInterval(t);
    }, [resendIn]);

    useEffect(() => {
        if (stage === 'verify' && inputRefs.current[0]) {
            inputRefs.current[0]?.focus();
        }
    }, [stage]);

    const handleOtpChange = (value: string, index: number) => {
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Move to next input if value is entered
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'Enter' && otp.every(digit => digit !== '')) {
            checkOtp();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const data = e.clipboardData.getData('text').slice(0, 6).split('');
        if (data.length === 6 && data.every(d => !isNaN(Number(d)))) {
            setOtp(data);
            inputRefs.current[5]?.focus();
        }
    };

    const sendOtp = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/verify/send-otp`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    channel: 'whatsapp',
                    phone: phoneNumber || inputPhone
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.message || 'Failed to send OTP');
                return;
            }
            setMaskedPhone(data.phone || null);
            setStage('verify');
            setResendIn(60);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const checkOtp = async () => {
        const code = otp.join('');
        if (code.length < 6) {
            setError('Enter the 6-digit code');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/verify/check-otp`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    code,
                    phone: phoneNumber || inputPhone
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.message || 'Invalid code');
                return;
            }
            onVerified();
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={20} /></button>

                <div className={styles.iconWrap}>
                    {stage === 'send' ? <MessageCircle size={32} /> : <ShieldCheck size={32} />}
                </div>

                <h3 className={styles.title}>
                    {title || (stage === 'send' ? 'Verify your mobile' : 'Enter security code')}
                </h3>

                <p className={styles.desc}>
                    {stage === 'send'
                        ? (description || 'We will send a 6-digit verification code to your WhatsApp number.')
                        : `We've sent a 6-digit code to ${maskedPhone || phoneNumber || 'your WhatsApp'}.`}
                </p>

                {stage === 'send' && (phoneNumber ? (
                    <div className={styles.phoneBox}>{phoneNumber}</div>
                ) : (
                    <div className={styles.inputWrapper}>
                        <input
                            type="text"
                            placeholder="Enter your phone number (e.g. 0501234567)"
                            value={inputPhone}
                            onChange={(e) => setInputPhone(e.target.value)}
                            className={styles.phoneInput}
                        />
                    </div>
                ))}

                {stage === 'verify' && (
                    <div className={styles.otpContainer} onPaste={handlePaste}>
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => { inputRefs.current[index] = el; }}
                                className={styles.otpInput}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                spellCheck={false}
                                onChange={e => handleOtpChange(e.target.value, index)}
                                onKeyDown={e => handleKeyDown(e, index)}
                            />
                        ))}
                    </div>
                )}

                {error && (
                    <div className={styles.error}>
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <button
                    className={styles.primaryBtn}
                    onClick={stage === 'send' ? sendOtp : checkOtp}
                    disabled={loading || (stage === 'send' && !phoneNumber && !inputPhone) || (stage === 'verify' && otp.some(d => d === ''))}
                >
                    {loading && <span className={styles.loader}></span>}
                    {loading ? 'Processing…' : stage === 'send' ? 'Send WhatsApp OTP' : 'Verify Account'}
                </button>

                {stage === 'verify' && (
                    <button
                        className={styles.linkBtn}
                        onClick={sendOtp}
                        disabled={resendIn > 0 || loading}
                    >
                        {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default OtpVerifyModal;

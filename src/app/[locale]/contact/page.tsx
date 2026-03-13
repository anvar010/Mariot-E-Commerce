'use client';

import React, { useState, useRef, useEffect } from 'react';
import Header from '@/components/Layout/Header/Header';
import Footer from '@/components/Layout/Footer/Footer';
import FloatingActions from '@/components/shared/FloatingActions/FloatingActions';
import styles from './page.module.css';
import { MapPin, Mail, Phone, Clock, ChevronDown, User, List } from 'lucide-react';
import { useTranslations } from 'next-intl';

const countries = [
    { code: '+971', flag: 'ae', name: 'UAE' },
    { code: '+966', flag: 'sa', name: 'Saudi Arabia' },
    { code: '+968', flag: 'om', name: 'Oman' },
    { code: '+974', flag: 'qa', name: 'Qatar' },
    { code: '+973', flag: 'bh', name: 'Bahrain' },
    { code: '+965', flag: 'kw', name: 'Kuwait' },
    { code: '+91', flag: 'in', name: 'India' },
    { code: '+92', flag: 'pk', name: 'Pakistan' },
    { code: '+63', flag: 'ph', name: 'Philippines' },
    { code: '+44', flag: 'gb', name: 'UK' },
    { code: '+1', flag: 'us', name: 'USA' },
    { code: '+20', flag: 'eg', name: 'Egypt' },
    { code: '+962', flag: 'jo', name: 'Jordan' },
    { code: '+961', flag: 'lb', name: 'Lebanon' },
    { code: '+90', flag: 'tr', name: 'Turkey' },
];

export default function ContactPage() {
    const t = useTranslations('contactPage');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        countryCode: '+971',
        phone: '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [statusMsg, setStatusMsg] = useState('');
    const [codeOpen, setCodeOpen] = useState(false);
    const [subjectOpen, setSubjectOpen] = useState(false);
    const codeRef = useRef<HTMLDivElement>(null);
    const subjectRef = useRef<HTMLDivElement>(null);

    const subjectOptions = [
        'General Inquiry',
        'Product Information',
        'Order Support',
        'Returns & Replacements',
        'Shipping Question',
        'Partnership / B2B',
        'Other'
    ];

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (codeRef.current && !codeRef.current.contains(e.target as Node)) {
                setCodeOpen(false);
            }
            if (subjectRef.current && !subjectRef.current.contains(e.target as Node)) {
                setSubjectOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const selectedCountry = countries.find(c => c.code === formData.countryCode) || countries[0];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/contact`, {
                credentials: "include",
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.success) {
                setStatus('success');
                setStatusMsg(data.message);
                setFormData({ name: '', email: '', countryCode: '+971', phone: '', subject: '', message: '' });
            } else {
                setStatus('error');
                setStatusMsg(data.message || 'Something went wrong.');
            }
        } catch {
            setStatus('error');
            setStatusMsg('Failed to send message. Please try again later.');
        }
    };

    return (
        <main className={styles.main}>
            <Header />
            <div className={styles.container}>
                <h1 className={styles.pageTitle}>{t('title')}</h1>
                <p className={styles.pageSubtitle}>{t('subtitle')}</p>

                <div className={styles.contactGrid}>
                    {/* Left Side: Company Info */}
                    <div className={styles.companyInfo}>
                        <div className={styles.infoCard}>
                            <h3>{t('getInTouch')}</h3>

                            <div className={styles.contactItem}>
                                <div className={styles.contactItemIcon}>
                                    <MapPin size={20} />
                                </div>
                                <div className={styles.contactItemDetails}>
                                    <strong>{t('headOffice')}</strong>
                                    <span>Salah Al Din St, Dubai, UAE</span>
                                </div>
                            </div>

                            <div className={styles.contactItem}>
                                <div className={styles.contactItemIcon}>
                                    <Phone size={20} />
                                </div>
                                <div className={styles.contactItemDetails}>
                                    <strong>{t('phone')}</strong>
                                    <a href="tel:+97142882777" dir="ltr">+971 4 288 2777</a>
                                    <a href="tel:+971501203917" dir="ltr">+971 50 120 3917</a>
                                </div>
                            </div>

                            <div className={styles.contactItem}>
                                <div className={styles.contactItemIcon}>
                                    <Mail size={20} />
                                </div>
                                <div className={styles.contactItemDetails}>
                                    <strong>{t('email')}</strong>
                                    <a href="mailto:info@mariot-group.com">info@mariot-group.com</a>
                                    <a href="mailto:support@mariot-group.com">support@mariot-group.com</a>
                                </div>
                            </div>

                            <div className={styles.contactItem}>
                                <div className={styles.contactItemIcon}>
                                    <Clock size={20} />
                                </div>
                                <div className={styles.contactItemDetails}>
                                    <strong>{t('workingHours')}</strong>
                                    <span>Monday – Saturday: 9:00 AM – 8:00 PM</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Contact Form */}
                    <div className={styles.formCard}>
                        <div className={styles.formHeader}>
                            <div className={styles.formHeaderContent}>
                                <h3>{t('sendMessage')}</h3>
                                <p className={styles.formHeaderSub}>{t('sendMessageSub')}</p>
                            </div>
                            <div className={styles.formHeaderIcon}>
                                <Mail size={28} />
                            </div>
                        </div>

                        <div className={styles.formBody}>
                            {status === 'success' && <div className={styles.successMsg}>{statusMsg}</div>}
                            {status === 'error' && <div className={styles.errorMsg}>{statusMsg}</div>}

                            <form onSubmit={handleSubmit}>
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>{t('fullName')} <span>*</span></label>
                                        <div className={styles.inputWrapper}>
                                            <div className={styles.inputIcon}><User size={16} /></div>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                placeholder={t('fullNamePlaceholder')}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>{t('emailAddress')} <span>*</span></label>
                                        <div className={styles.inputWrapper}>
                                            <div className={styles.inputIcon}><Mail size={16} /></div>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder={t('emailAddressPlaceholder')}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>{t('phoneNumber')} <span>*</span></label>
                                        <div className={styles.phoneInputGroup}>
                                            <div className={styles.countryCodeWrapper} ref={codeRef}>
                                                <button
                                                    type="button"
                                                    className={styles.countryCodeBtn}
                                                    onClick={() => setCodeOpen(!codeOpen)}
                                                >
                                                    <img
                                                        src={`https://flagcdn.com/24x18/${selectedCountry.flag}.png`}
                                                        alt={selectedCountry.name}
                                                        className={styles.flagImg}
                                                    />
                                                    <span>{selectedCountry.code}</span>
                                                    <ChevronDown size={14} />
                                                </button>
                                                {codeOpen && (
                                                    <div className={styles.countryDropdown}>
                                                        {countries.map((c) => (
                                                            <div
                                                                key={c.code}
                                                                className={`${styles.countryOption} ${c.code === formData.countryCode ? styles.countryOptionActive : ''}`}
                                                                onClick={() => {
                                                                    setFormData({ ...formData, countryCode: c.code });
                                                                    setCodeOpen(false);
                                                                }}
                                                            >
                                                                <img
                                                                    src={`https://flagcdn.com/24x18/${c.flag}.png`}
                                                                    alt={c.name}
                                                                    className={styles.flagImg}
                                                                />
                                                                <span className={styles.countryName}>{c.name}</span>
                                                                <span className={styles.countryCode}>{c.code}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                placeholder={t('phoneNumberPlaceholder')}
                                                className={styles.phoneInput}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>{t('subject')} <span>*</span></label>
                                        <div className={styles.subjectWrapper} ref={subjectRef}>
                                            <button
                                                type="button"
                                                className={`${styles.subjectBtn} ${formData.subject ? styles.subjectBtnSelected : ''}`}
                                                onClick={() => setSubjectOpen(!subjectOpen)}
                                            >
                                                <List size={16} className={styles.subjectBtnIcon} />
                                                <span>{formData.subject || t('selectSubject')}</span>
                                                <ChevronDown size={15} className={`${styles.subjectChevron} ${subjectOpen ? styles.subjectChevronOpen : ''}`} />
                                            </button>
                                            {subjectOpen && (
                                                <div className={styles.subjectDropdown}>
                                                    {subjectOptions.map((opt) => (
                                                        <div
                                                            key={opt}
                                                            className={`${styles.subjectOption} ${formData.subject === opt ? styles.subjectOptionActive : ''}`}
                                                            onClick={() => {
                                                                setFormData({ ...formData, subject: opt });
                                                                setSubjectOpen(false);
                                                            }}
                                                        >
                                                            {opt}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label>{t('message')} <span>*</span></label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        placeholder={t('messagePlaceholder')}
                                        required
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={status === 'loading'}
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <span className={styles.spinner}></span>
                                            {t('sending')}
                                        </>
                                    ) : (
                                        <>
                                            {t('submitBtn')}
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Locations Row - Horizontal */}
                <div className={styles.locationsSection}>
                    <h2 className={styles.locationsSectionTitle}>{t('locationsTitle')}</h2>
                    <div className={styles.locationsRow}>
                        <div className={styles.locationCard}>
                            <div className={styles.locationHeader}>
                                <MapPin size={18} />
                                <h4>{t('dubaiBranch')}</h4>
                            </div>
                            <p>{t('dubaiAddr')}</p>
                            <a href="mailto:admin@mariotkitchen.com">admin@mariotkitchen.com</a>
                            <a href="tel:+97142882777" dir="ltr">+971 4-288-2777</a>
                            <div className={styles.miniMap}>
                                <iframe title="Mariot Dubai" src="https://maps.google.com/maps?q=Mariot%20Kitchen%20Equipment%20Dubai&t=&z=15&ie=UTF8&iwloc=B&output=embed" loading="lazy"></iframe>
                            </div>
                        </div>

                        <div className={styles.locationCard}>
                            <div className={styles.locationHeader}>
                                <MapPin size={18} />
                                <h4>{t('alAinBranch')}</h4>
                            </div>
                            <p>{t('alAinAddr')}</p>
                            <a href="mailto:alain@mariotkitchen.com">alain@mariotkitchen.com</a>
                            <a href="tel:+97137227337" dir="ltr">+971 3-722-7337</a>
                            <div className={styles.miniMap}>
                                <iframe title="Mariot Al Ain" src="https://maps.google.com/maps?q=ماريوت%20لمعدات%20المطابخ%20Al%20Ain&t=&z=15&ie=UTF8&iwloc=B&output=embed" loading="lazy"></iframe>
                            </div>
                        </div>

                        <div className={styles.locationCard}>
                            <div className={styles.locationHeader}>
                                <MapPin size={18} />
                                <h4>{t('abuDhabiBranch')}</h4>
                            </div>
                            <p>{t('abuDhabiAddr')}</p>
                            <a href="mailto:sales2@mariotkitchen.com">sales2@mariotkitchen.com</a>
                            <a href="tel:+97126459353" dir="ltr">+971 2-645-9353</a>
                            <div className={styles.miniMap}>
                                <iframe title="Mariot Abu Dhabi" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1500!2d54.3744507!3d24.5026967!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5e66f6711522f7%3A0xba8c40636e4d1dc1!2s!5e0!3m2!1sen!2sae" loading="lazy"></iframe>
                            </div>
                        </div>

                        <div className={styles.locationCard}>
                            <div className={styles.locationHeader}>
                                <MapPin size={18} />
                                <h4>{t('sharjahMajazBranch')}</h4>
                            </div>
                            <p>{t('sharjahMajazAddr')}</p>
                            <a href="mailto:sales@mariot-group.com">sales@mariot-group.com</a>
                            <a href="tel:+97167677777" dir="ltr">+971 6-767-7777</a>
                            <div className={styles.miniMap}>
                                <iframe title="Mariot Sharjah Majaz" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1500!2d55.3824161!3d25.3168016!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5b111a48b363%3A0xf594b5fad15d22af!2s!5e0!3m2!1sen!2sae" loading="lazy"></iframe>
                            </div>
                        </div>

                        <div className={styles.locationCard}>
                            <div className={styles.locationHeader}>
                                <MapPin size={18} />
                                <h4>{t('sharjahIndBranch')}</h4>
                            </div>
                            <p>{t('sharjahIndAddr')}</p>
                            <a href="mailto:factory@mariotkitchen.com">factory@mariotkitchen.com</a>
                            <a href="tel:+97167677776" dir="ltr">+971 6-767-7776</a>
                            <div className={styles.miniMap}>
                                <iframe title="Mariot Sharjah Industrial" src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1500!2d55.4295081!3d25.2927685!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5f1068f8c01d%3A0xfa273e3af48feb67!2s!5e0!3m2!1sen!2sae" loading="lazy"></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
            <FloatingActions />
        </main>
    );
}

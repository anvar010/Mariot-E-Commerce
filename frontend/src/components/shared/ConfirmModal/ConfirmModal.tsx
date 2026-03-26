'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import styles from './ConfirmModal.module.css';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    type = 'danger',
    isLoading = false
}) => {
    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertCircle className={styles.iconDanger} size={32} />;
            case 'warning': return <AlertTriangle className={styles.iconWarning} size={32} />;
            default: return <Info className={styles.iconInfo} size={32} />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className={styles.overlay}>
                    <motion.div 
                        className={styles.backdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                    />
                    <motion.div 
                        className={styles.modal}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <button className={styles.closeBtn} onClick={onCancel}>
                            <X size={20} />
                        </button>

                        <div className={styles.content}>
                            <div className={styles.iconWrapper}>
                                {getIcon()}
                            </div>
                            <div className={styles.textSection}>
                                <h2 className={styles.title}>{title}</h2>
                                <p className={styles.message}>{message}</p>
                            </div>
                        </div>

                        <div className={styles.footer}>
                            <button 
                                className={styles.cancelBtn} 
                                onClick={onCancel}
                                disabled={isLoading}
                            >
                                {cancelLabel}
                            </button>
                            <button 
                                className={`${styles.confirmBtn} ${styles[type]}`}
                                onClick={onConfirm}
                                disabled={isLoading}
                            >
                                {isLoading ? <div className={styles.loader}></div> : confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;

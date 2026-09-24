import React from 'react';

/**
 * The WhatsApp mark.
 *
 * lucide-react, which supplies every other icon in the admin, carries no brand icons --
 * its MessageCircle was standing in for this and reads as a generic chat bubble, so a
 * WhatsApp action was indistinguishable from any other messaging one.
 *
 * The path is the same one the storefront's floating action button already draws, lifted
 * into a component so both render an identical mark rather than keeping two copies of the
 * geometry in sync by hand.
 *
 * `fill="currentColor"` so it inherits the surrounding colour exactly as a lucide icon
 * does, and can sit in a row of them without looking pasted in.
 */
interface Props {
    size?: number;
    className?: string;
}

const WhatsappIcon: React.FC<Props> = ({ size = 16, className }) => (
    <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        className={className}
        aria-hidden="true"
        focusable="false"
    >
        <path d="M12.03 2c-5.52 0-10 4.48-10 10a9.96 9.96 0 0 0 1.53 5.39L2.03 22l4.75-1.25c1.54.85 3.32 1.33 5.25 1.33 5.52 0 10-4.48 10-10S17.55 2 12.03 2zm6.3 14.54c-.27.76-1.55 1.48-2.14 1.57-.59.09-1.34.22-3.83-.82-2.92-1.21-4.74-4.22-4.88-4.42-.15-.2-1.18-1.56-1.18-2.98 0-1.42.74-2.12 1.01-2.4.27-.28.59-.35.79-.35.19 0 .38.01.54.02.17.01.4-.04.62.5.24.59.81 1.99.88 2.14.07.15.11.32.01.52-.09.20-.14.33-.28.5-.14.17-.3.38-.43.51-.15.15-.3.32-.13.62.17.3.74 1.23 1.59 1.99.85.76 1.56 1 1.86 1.15.3.15.47.13.65-.08.18-.21.76-.89.96-1.2.2-.31.4-.26.68-.15.28.11 1.77.84 2.08.99.31.15.51.22.59.35.08.13.08.73-.19 1.48z" />
    </svg>
);

export default WhatsappIcon;

import { NextRequest, NextResponse } from 'next/server';

// Whitelist of allowed image source domains to prevent SSRF attacks
const ALLOWED_DOMAINS = [
    'mariotstore.com',
    'www.mariotstore.com',
    'mariot-backend.onrender.com',
    'images.unsplash.com',
    'plus.unsplash.com',
    'via.placeholder.com',
    'www.rational-online.com',
];

function isAllowedUrl(urlString: string): boolean {
    try {
        const parsed = new URL(urlString);
        // Only allow HTTPS (and HTTP for localhost in dev)
        if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && parsed.hostname === 'localhost')) {
            return false;
        }
        // Block private/internal IPs
        if (['127.0.0.1', '0.0.0.0', '::1'].includes(parsed.hostname) && parsed.hostname !== 'localhost') {
            return false;
        }
        // Check domain whitelist (allow localhost for dev)
        if (parsed.hostname === 'localhost') return true;
        return ALLOWED_DOMAINS.some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Validate URL against whitelist to prevent SSRF
    if (!isAllowedUrl(url)) {
        return NextResponse.json(
            { error: 'Domain not allowed. Only approved image sources are permitted.' },
            { status: 403 }
        );
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const response = await fetch(url, {
            signal: controller.signal,
            redirect: 'error', // Prevent open redirect attacks
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
        }

        // Validate content-type is actually an image
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
            return NextResponse.json(
                { error: 'URL does not point to a valid image resource' },
                { status: 400 }
            );
        }

        // Limit response size to 10MB to prevent memory abuse
        const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
        if (contentLength > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 413 });
        }

        const arrayBuffer = await response.arrayBuffer();

        // Double-check actual size after download
        if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Image too large (max 10MB)' }, { status: 413 });
        }

        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');

        return NextResponse.json({
            success: true,
            base64: `data:${contentType};base64,${base64}`
        });
    } catch (error: any) {
        // Don't leak internal error details to the client
        const message = error.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch image';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

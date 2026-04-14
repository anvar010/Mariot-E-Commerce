'use client';

// Temporary file to trigger the Error Boundary for testing
export default function TestErrorPage() {
    // This immediately crashes the page to test our boundary!
    throw new Error("This is a test error to trigger the Error.tsx boundary.");

    return <div>This will never be seen</div>;
}

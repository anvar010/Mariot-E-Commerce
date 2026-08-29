/**
 * Central error handler.
 *
 * The distinction that matters here is between a request that failed because
 * someone did something the API is designed to refuse, and a request that failed
 * because something is wrong with the API. The first is routine and deserves one
 * line; the second deserves a stack trace.
 *
 * Everything used to get the stack trace, so the runtime log filled with
 * sixteen-line dumps for expired sessions and blocked origins — the two most
 * common events on a public storefront — and a genuine fault had to be found
 * among them.
 */

// Refusals the API makes on purpose. Each is a one-line warning: the message and
// the route say everything there is to know.
const EXPECTED = [
    {
        match: (err) => err.message === 'Not allowed by CORS',
        status: 403,
        // The origin is already logged by the CORS check itself in app.js.
        line: (err, req) => `[CORS] Refused ${req.method} ${req.originalUrl}`,
    },
    {
        match: (err) => err.name === 'TokenExpiredError',
        status: 401,
        line: (err, req) => `[AUTH] Session expired — ${req.method} ${req.originalUrl}`,
    },
    {
        match: (err) => err.name === 'JsonWebTokenError',
        status: 401,
        line: (err, req) => `[AUTH] Bad token (${err.message}) — ${req.method} ${req.originalUrl}`,
    },
];

const errorHandler = (err, req, res, next) => {
    const expected = EXPECTED.find(e => e.match(err));

    if (expected) {
        console.warn(expected.line(err, req));
        return res.status(expected.status).json({
            success: false,
            message: err.message || 'Request refused',
        });
    }

    // Anything else is unexpected by definition, so keep the full trace.
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
    console.error(err.stack || err);

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = errorHandler;

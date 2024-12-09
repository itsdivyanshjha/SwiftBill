const logger = {
    info: (message, data = '') => {
        console.log(`[INFO] ${message}`, data ? data : '');
    },
    error: (message, error = '') => {
        console.error(`[ERROR] ${message}`, error ? error : '');
        if (error && error.stack) {
            console.error('[ERROR STACK]', error.stack);
        }
    },
    debug: (message, data = '') => {
        console.log(`[DEBUG] ${message}`, data ? data : '');
    },
    request: (req) => {
        console.log(`[REQUEST] ${req.method} ${req.url}`);
        console.log('[REQUEST HEADERS]', req.headers);
        console.log('[REQUEST BODY]', req.body);
        if (req.file) {
            console.log('[REQUEST FILE]', {
                filename: req.file.filename,
                mimetype: req.file.mimetype,
                size: req.file.size
            });
        }
    }
};

module.exports = logger; 
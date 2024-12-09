const logger = {
    info: (message, data = '') => {
        console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    },
    error: (message, error = '') => {
        console.error(`[ERROR] ${message}`, error);
        if (error && error.stack) {
            console.error('[ERROR STACK]', error.stack);
        }
    },
    debug: (message, data = '') => {
        console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
};

module.exports = logger; 
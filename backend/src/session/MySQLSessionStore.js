const session = require('express-session');

const DEFAULT_SESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

function sanitizeTableName(value) {
    const fallback = 'sessions';
    if (typeof value !== 'string') return fallback;

    const trimmed = value.trim();
    return /^[A-Za-z0-9_]+$/.test(trimmed) ? trimmed : fallback;
}

function normalizeUserId(sess) {
    const rawUserId = sess?.user?.id ?? sess?.user?.internal_id ?? null;
    if (rawUserId === null || rawUserId === undefined || rawUserId === '') {
        return null;
    }

    const numericUserId = Number(rawUserId);
    return Number.isFinite(numericUserId) ? numericUserId : null;
}

function resolveLifetimeMs(sess, fallbackMs) {
    const cookie = sess?.cookie || {};
    const maxAge = Number(cookie.originalMaxAge ?? cookie.maxAge);

    if (Number.isFinite(maxAge) && maxAge > 0) {
        return maxAge;
    }

    return fallbackMs;
}

function isExpiredSession(sess, lastActivitySeconds, fallbackMs) {
    const expiresAt = sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : null;
    if (Number.isFinite(expiresAt)) {
        return expiresAt <= Date.now();
    }

    const lifetimeMs = resolveLifetimeMs(sess, fallbackMs);
    const lastActivityMs = Number(lastActivitySeconds || 0) * 1000;

    return lastActivityMs > 0 && (lastActivityMs + lifetimeMs) <= Date.now();
}

class MySQLSessionStore extends session.Store {
    constructor(pool, options = {}) {
        super();

        if (!pool || typeof pool.query !== 'function') {
            throw new Error('MySQLSessionStore requires a mysql2 promise pool');
        }

        this.pool = pool;
        this.tableName = sanitizeTableName(options.tableName);
        this.defaultSessionLifetimeMs = Number(options.defaultSessionLifetimeMs) > 0
            ? Number(options.defaultSessionLifetimeMs)
            : DEFAULT_SESSION_LIFETIME_MS;
        this.cleanupIntervalMs = Number(options.cleanupIntervalMs) >= 0
            ? Number(options.cleanupIntervalMs)
            : DEFAULT_CLEANUP_INTERVAL_MS;
        this.cleanupTimer = null;

        this.ready = this.init().catch((error) => {
            console.error('[Session Store] Initialization failed:', error);
            throw error;
        });

        this.ready.catch(() => {});
        this.ready.then(() => this.startCleanupTimer()).catch(() => {});
    }

    async init() {
        try {
            await this.pool.query(`SELECT 1 FROM \`${this.tableName}\` LIMIT 1`);
            return;
        } catch (error) {
            if (error?.code !== 'ER_NO_SUCH_TABLE') {
                throw error;
            }
        }

        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS \`${this.tableName}\` (
                id VARCHAR(255) NOT NULL,
                user_id BIGINT UNSIGNED NULL,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                payload LONGTEXT NOT NULL,
                last_activity INT NOT NULL,
                PRIMARY KEY (id),
                KEY \`${this.tableName}_user_id_index\` (user_id),
                KEY \`${this.tableName}_last_activity_index\` (last_activity)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    startCleanupTimer() {
        if (this.cleanupTimer || this.cleanupIntervalMs <= 0) {
            return;
        }

        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredSessions().catch((error) => {
                console.error('[Session Store] Failed to clean expired sessions:', error);
            });
        }, this.cleanupIntervalMs);

        if (typeof this.cleanupTimer.unref === 'function') {
            this.cleanupTimer.unref();
        }
    }

    async cleanupExpiredSessions() {
        const cutoffSeconds = Math.floor(
            (Date.now() - this.defaultSessionLifetimeMs) / 1000
        );

        await this.pool.query(
            `DELETE FROM \`${this.tableName}\` WHERE last_activity < ?`,
            [cutoffSeconds]
        );
    }

    get(sid, callback) {
        this.ready
            .then(async () => {
                const [rows] = await this.pool.query(
                    `SELECT payload, last_activity FROM \`${this.tableName}\` WHERE id = ? LIMIT 1`,
                    [sid]
                );

                if (!Array.isArray(rows) || rows.length === 0) {
                    callback(null, null);
                    return;
                }

                const row = rows[0];
                const sess = JSON.parse(row.payload || '{}');

                if (isExpiredSession(sess, row.last_activity, this.defaultSessionLifetimeMs)) {
                    await this.destroyAsync(sid);
                    callback(null, null);
                    return;
                }

                callback(null, sess);
            })
            .catch((error) => callback(error));
    }

    set(sid, sess, callback = () => {}) {
        this.ready
            .then(async () => {
                const payload = JSON.stringify(sess);
                const userId = normalizeUserId(sess);
                const lastActivity = Math.floor(Date.now() / 1000);

                await this.pool.query(
                    `INSERT INTO \`${this.tableName}\` (id, user_id, ip_address, user_agent, payload, last_activity)
                     VALUES (?, ?, NULL, NULL, ?, ?)
                     ON DUPLICATE KEY UPDATE
                        user_id = VALUES(user_id),
                        payload = VALUES(payload),
                        last_activity = VALUES(last_activity)`,
                    [sid, userId, payload, lastActivity]
                );

                callback(null);
            })
            .catch((error) => callback(error));
    }

    touch(sid, sess, callback = () => {}) {
        this.ready
            .then(async () => {
                const payload = JSON.stringify(sess);
                const userId = normalizeUserId(sess);
                const lastActivity = Math.floor(Date.now() / 1000);

                await this.pool.query(
                    `UPDATE \`${this.tableName}\`
                     SET user_id = ?, payload = ?, last_activity = ?
                     WHERE id = ?`,
                    [userId, payload, lastActivity, sid]
                );

                callback(null);
            })
            .catch((error) => callback(error));
    }

    destroy(sid, callback = () => {}) {
        this.destroyAsync(sid)
            .then(() => callback(null))
            .catch((error) => callback(error));
    }

    async destroyAsync(sid) {
        await this.ready;
        await this.pool.query(`DELETE FROM \`${this.tableName}\` WHERE id = ?`, [sid]);
    }
}

module.exports = MySQLSessionStore;

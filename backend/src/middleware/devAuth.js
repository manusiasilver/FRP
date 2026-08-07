const bcrypt = require('bcryptjs');
const { centralDb } = require('../../db');
const { LOGIN_SQL } = require('../config/constants');
const { userFromLoginRows } = require('../services/dbService');

async function devAuth(req, res, next) {
    const enabled =
        process.env.NODE_ENV !== 'production' &&
        process.env.DEV_AUTH_ENABLED === 'true';

    if (!enabled) return next();

    if (req.session && req.session.user) {
        res.locals.user = req.session.user;
        req.user = req.session.user;
        return next();
    }

    const username = process.env.DEV_AUTH_USERNAME;
    const password = process.env.DEV_AUTH_PASSWORD;

    if (!username || !password) {
        return res.status(500).json({
            error: 'DEV_AUTH_USERNAME and DEV_AUTH_PASSWORD are required in .env.local',
        });
    }

    try {
        const [rows] = await centralDb.query(LOGIN_SQL, [username]);

        if (!rows || rows.length === 0) {
            return res.status(401).json({
                error: 'Dev auth user not found in central_users',
                username,
            });
        }

        const passwordHash = rows[0].password || '';
        const validPassword = await bcrypt.compare(password, passwordHash);

        if (!validPassword) {
            return res.status(401).json({
                error: 'Invalid DEV_AUTH_PASSWORD',
                username,
            });
        }

        const userFromDb = userFromLoginRows(rows);

        if (!userFromDb) {
            return res.status(401).json({
                error: 'Failed to build dev auth user session',
                username,
            });
        }

        const user = {
            ...userFromDb,
            sso: false,
            apps: userFromDb.apps && userFromDb.apps.length ? userFromDb.apps : ['docnumber'],
            cv: userFromDb.cv ?? rows[0].token_version ?? null,
        };

        req.session.user = user;
        req.user = user;
        res.locals.user = user;

        return next();
    } catch (err) {
        return res.status(500).json({
            error: 'Dev auth failed',
            details: err.message,
        });
    }
}

module.exports = {
    devAuth,
};
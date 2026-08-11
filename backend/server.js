// ============================================================
// FRP Backend — Entry Point
// ============================================================
// Struktur modul:
//   src/config/       — Konstanta & SQL templates
//   src/utils/        — Helper functions (json, company, appShell)
//   src/services/     — Database service layer
//   src/middleware/   — Auth, IT check, scope guards
//   src/routes/       — Route handlers per fitur
// ============================================================

require('dotenv').config({
    path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local'
});
const { devAuth } = require('./src/middleware/devAuth');
const express = require('express');
const path = require('path');
const session = require('express-session');
const MySQLSessionStore = require('./src/session/MySQLSessionStore');

// --- Routes ---
const authRoutes      = require('./src/routes/auth');
const frpRoutes       = require('./src/routes/frp');
const rpRoutes        = require('./src/routes/rp');
const adminRoutes     = require('./src/routes/admin');
const laporanRoutes   = require('./src/routes/laporan');
const dashboardRoutes = require('./src/routes/dashboard');
const pdfRoutes       = require('./src/routes/pdf');
const budgetRoutes    = require('./src/routes/budget');
const documentRoutes  = require('./src/routes/document');

const app  = express();
const PORT = process.env.PORT || 3000;
const IS_DEV = process.env.NODE_ENV !== 'production';

const frontendPath = path.join(__dirname, '..', 'frontend');
const pdfPath      = path.join(__dirname, 'generated-pdfs');
const { frpDb, centralDb } = require('./db');
const { LOGIN_SQL } = require('./src/config/constants');
const { userFromLoginRows } = require('./src/services/dbService');
const { findAssignment, findCompany, applySelectedAssignment } = require('./src/utils/accessScope');
const jwt = require('jsonwebtoken');

function isJwtLike(token) {
    if (typeof token !== 'string') return false;
    const parts = token.split('.');
    return parts.length === 3 && parts.every(Boolean);
}

// ============================================================
// STATIC FILES
// ============================================================
app.use(express.static(path.join(frontendPath, 'dist')));
app.use(express.static(path.join(frontendPath, 'public')));
app.use('/pdfs', express.static(pdfPath));
app.set('view cache', false);
app.set('trust proxy', 1);

// ============================================================
// BODY PARSERS
// ============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    if (
        req.path.startsWith('/api/auth/') ||
        req.path === '/api/data/select-company' ||
        req.path === '/api/data/select-division'
    ) {
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, private',
            Pragma: 'no-cache',
            Expires: '0',
            Vary: 'Cookie, Authorization',
        });
    }

    next();
});

// ============================================================
// SESSION
// ============================================================
const sessionStore = new MySQLSessionStore(frpDb, {
    tableName: process.env.SESSION_TABLE_NAME || 'sessions',
});

app.use(session({
    store: sessionStore,
    name: process.env.SESSION_COOKIE_NAME || 'frp.sid',
    secret: process.env.SESSION_SECRET || 'frp-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.SESSION_SAMESITE || (IS_DEV ? 'lax' : 'none'),
        secure: process.env.SESSION_SECURE
            ? process.env.SESSION_SECURE === 'true'
            : !IS_DEV,
    },
}));

app.use(devAuth);

app.use(async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const rawToken = req.query.token || bearerToken;
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';

    if (!token) {
        return next();
    }

    if (!isJwtLike(token)) {
        return next();
    }

    // Di dev mode tanpa JWT_SECRET, abaikan token (devAuth sudah handle session)
    if (!process.env.JWT_SECRET) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const allowedApps = Array.isArray(decoded.apps) ? decoded.apps : [];
        if (!allowedApps.includes('docnumber')) {
            return res.status(403).json({ error: 'Forbidden: docnumber access denied' });
        }

        // Kalau session sudah ada, tetap cek token_version supaya logout pusat kebaca
        if (req.session.user) {
            const [versionRows] = await centralDb.query(
                'SELECT token_version FROM central_users WHERE id = ? AND is_active = 1 LIMIT 1',
                [decoded.sub]
            );

            const currentVersion = Number(versionRows?.[0]?.token_version ?? -1);
            const tokenVersion = Number(decoded.cv ?? -2);

            if (currentVersion !== tokenVersion) {
                req.session.destroy(() => {});
                return res.status(401).json({ error: 'Token expired' });
            }

            return next();
        }

        const username = decoded.username;
        if (!username) {
            return res.status(401).json({ error: 'Invalid token payload' });
        }

        const [rows] = await centralDb.query(LOGIN_SQL, [username]);

        if (!rows.length) {
            return res.status(401).json({ error: 'User not found in central database' });
        }

        const currentVersion = Number(rows[0].token_version ?? -1);
        const tokenVersion = Number(decoded.cv ?? -2);

        if (currentVersion !== tokenVersion) {
            return res.status(401).json({ error: 'Token expired' });
        }

        const user = userFromLoginRows(rows);

        if (!user) {
            return res.status(401).json({ error: 'Failed to build user session' });
        }

        req.session.user = {
            ...user,
            sso: true,
            apps: allowedApps,
            cv: user.cv ?? decoded.cv ?? null,
        };
        
        req.session.save((err) => {
            if (err) {
                console.error('Failed to save SSO session:', err);
                return res.status(500).json({ error: 'Failed to save session' });
            }

            return next();
        });
    } catch (error) {
        console.error('SSO token error:', error.message);

        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        return res.redirect('/');
    }
});

app.use((req, res, next) => {
    if (!req.session?.user) {
        return next();
    }

    const requestedCompany = req.headers['x-selected-company'];
    const requestedDivision = req.headers['x-selected-division'];

    if (!requestedCompany && !requestedDivision) {
        return next();
    }

    const assignment = findAssignment(req.session.user, requestedCompany, requestedDivision);
    const company = findCompany(req.session.user, requestedCompany);

    if (!assignment && !company) {
        return next();
    }

    const previousCompany = req.session.user.selectedCompany || '';
    const previousDivision = req.session.user.selectedDivision || '';

    applySelectedAssignment(req.session.user, assignment, requestedCompany, requestedDivision);

    if (
        previousCompany !== req.session.user.selectedCompany ||
        previousDivision !== req.session.user.selectedDivision
    ) {
        console.log('[Auth Scope Sync] Applied scope from request headers:', {
            path: req.path,
            previousCompany,
            previousDivision,
            nextCompany: req.session.user.selectedCompany,
            nextDivision: req.session.user.selectedDivision,
        });
    }

    next();
});

app.get('/api/dev/auth-user', (req, res) => {
    res.json({
        devAuthEnabled: process.env.DEV_AUTH_ENABLED === 'true',
        user: req.session.user || null,
    });
});

// ============================================================
// SPA HELPER — injects res.sendSPA() for all routes to use
// ============================================================
app.use((req, res, next) => {
    res.sendSPA = () => res.sendFile(path.join(frontendPath, 'dist', 'index.html'));
    next();
});

// ============================================================
// ROUTES
// ============================================================
app.use(authRoutes);
app.use(frpRoutes);
app.use(rpRoutes);
app.use(adminRoutes);
app.use(laporanRoutes);
app.use(dashboardRoutes);
app.use(pdfRoutes);
app.use(budgetRoutes);
app.use(documentRoutes);
if (!IS_DEV) {
    app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path.startsWith('/api/') || req.path.startsWith('/pdfs/')) return next();
        if (!req.accepts('html')) return next();

        return res.sendFile(path.join(frontendPath, 'dist', 'index.html'));
    });
}
// ============================================================
// DEV MODE — Proxy ke Vite untuk HMR (Hot Module Replacement)
// ============================================================
if (IS_DEV) {
    const { createProxyMiddleware } = require('http-proxy-middleware');
    const viteProxy = createProxyMiddleware({
        target: 'http://localhost:5173',
        changeOrigin: true,
        ws: true, // penting untuk WebSocket HMR
        on: {
            error: (err, req, res) => {
                // Fallback ke dist jika Vite tidak berjalan
                if (res.sendFile) {
                    res.sendFile(path.join(frontendPath, 'dist', 'index.html'));
                }
            },
        },
    });
    app.use('/', viteProxy);
}

// ============================================================
// START SERVER
// ============================================================
const server = app.listen(PORT, '0.0.0.0', () => {
    const os   = require('os');
    const nets = os.networkInterfaces();
    const localIPs = Object.values(nets)
        .flat()
        .filter(n => n.family === 'IPv4' && !n.internal)
        .map(n => n.address);

    console.log(`\n FRP Backend running:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    localIPs.forEach(ip => console.log(`   Network: http://${ip}:${PORT}`));
    if (IS_DEV) console.log(`   Mode:    DEV (proxy HMR → Vite :5173)`);
    console.log('');
});

// Forward WebSocket upgrade untuk HMR
if (IS_DEV) {
    server.on('upgrade', (req, socket, head) => {
        const { createProxyMiddleware } = require('http-proxy-middleware');
        const wsProxy = createProxyMiddleware({ target: 'http://localhost:5173', ws: true });
        wsProxy.upgrade(req, socket, head);
    });
}
// Restart trigger

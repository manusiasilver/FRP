const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { checkAuth } = require('../middleware/auth');
const { fetchAllFrpRequests, fetchAllRpRequests } = require('../services/dbService');
const { renderPdfDocument } = require('../../renderPdfDocument');
const renderRpPdfDocument = require('../../renderRpPdfDocument');

const router = express.Router();

const pdfPath = path.join(__dirname, '../../generated-pdfs');

// ============================================================
// HELPERS
// ============================================================

function mapSessionUser(user) {
    return {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,

        companyId: user.companyId,
        companyCode: user.companyCode,
        companyName: user.companyName,

        departmentId: user.departmentId,
        departmentName: user.departmentName,
        departmentClass: user.departmentClass,
        departmentCode: user.departmentCode,

        jobLevelName: user.jobLevelName,
        jobLevelRank: user.jobLevelRank,

        allAssignments: user.allAssignments || [],
    };
}

async function renderPdfBuffer(html, options = {}) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: 'networkidle0',
        });

        return await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm',
            },
            ...options,
        });
    } finally {
        await browser.close();
    }
}

// ============================================================
// HISTORY PAGE & DATA
// ============================================================

router.get('/history', checkAuth, (req, res) => res.sendSPA());

router.get('/api/data/history', checkAuth, (req, res) => {
    const u = req.session.user;

    if (!fs.existsSync(pdfPath)) {
        return res.json({
            files: [],
            user: mapSessionUser(u),
        });
    }

    const files = fs.readdirSync(pdfPath)
        .filter(f => f.endsWith('.pdf'))
        .map(f => {
            const stats = fs.statSync(path.join(pdfPath, f));

            return {
                name: f,
                path: `/pdfs/${f}`,
                date: stats.mtime,
            };
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
        files,
        user: mapSessionUser(u),
    });
});

// ============================================================
// FRP PDF
// ============================================================

// Preview from request body
router.post('/preview', checkAuth, (req, res) => {
    const autoPrint = req.body.autoPrint === '1' || req.body.autoPrint === 'true';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderPdfDocument(req.body, true, { autoPrint }));
});

// Generate from request body
router.post('/generate-pdf', checkAuth, async (req, res) => {
    try {
        const html = renderPdfDocument(req.body, false);

        const pdfBuffer = await renderPdfBuffer(html);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="FRP-${req.body.frpNo || 'DRAFT'}.pdf"`
        );

        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to generate FRP PDF',
            details: error.message,
        });
    }
});

// Preview from saved FRP
router.get('/api/frp/:id/preview', checkAuth, async (req, res) => {
    try {
        const data = (await fetchAllFrpRequests()).find(r => r.id === req.params.id);

        if (!data) {
            return res.status(404).send('FRP not found');
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(renderPdfDocument(data, true));
    } catch (error) {
        res.status(500).json({
            error: 'Failed to preview FRP PDF',
            details: error.message,
        });
    }
});

// Generate from saved FRP
router.get('/api/frp/:id/pdf', checkAuth, async (req, res) => {
    try {
        const data = (await fetchAllFrpRequests()).find(r => r.id === req.params.id);

        if (!data) {
            return res.status(404).send('FRP not found');
        }

        const html = renderPdfDocument(data, false);
        const pdfBuffer = await renderPdfBuffer(html);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${data.frpNo || 'FRP-DRAFT'}.pdf"`
        );

        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to generate FRP PDF',
            details: error.message,
        });
    }
});

// ============================================================
// RP PDF
// ============================================================

router.get('/api/rp/:id/preview', checkAuth, async (req, res) => {
    try {
        const data = (await fetchAllRpRequests()).find(r => r.id === req.params.id);

        if (!data) {
            return res.status(404).send('RP not found');
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(renderRpPdfDocument(data, true));
    } catch (error) {
        res.status(500).json({
            error: 'Failed to preview RP PDF',
            details: error.message,
        });
    }
});

router.get('/api/rp/:id/pdf', checkAuth, async (req, res) => {
    try {
        const data = (await fetchAllRpRequests()).find(r => r.id === req.params.id);

        if (!data) {
            return res.status(404).send('RP not found');
        }

        const html = renderRpPdfDocument(data, false);

        const pdfBuffer = await renderPdfBuffer(html, {
            landscape: true,
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${data.rpNo || 'RP-DRAFT'}.pdf"`
        );

        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to generate RP PDF',
            details: error.message,
        });
    }
});

module.exports = router;

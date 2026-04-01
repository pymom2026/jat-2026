const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { scanJobEmails } = require('../services/gmail');
const { addJobs, getAllJobs, deleteJobs, getLastScan, setLastScan } = require('../services/googleSheets');
require('dotenv').config({ path: '../../.env' });

const router = express.Router();

router.use(requireAuth);

router.get('/scan-status', async (req, res) => {
  try {
    const lastScan = await getLastScan(
      req.user.accessToken,
      process.env.GOOGLE_SHEET_ID,
      req.user.id,
      req.user.refreshToken
    );
    res.json({ lastScan });
  } catch (err) {
    res.json({ lastScan: null });
  }
});

async function clearGmailEntries(accessToken, sheetId) {
  const all = await getAllJobs(accessToken, sheetId);
  const gmailRows = all.filter(j => j.source === 'Gmail');
  if (gmailRows.length > 0) {
    await deleteJobs(accessToken, sheetId, gmailRows.map(j => j.rowIndex));
  }
  return gmailRows.length;
}

router.post('/scan', async (req, res) => {
  try {
    const full = req.query.full === 'true';
    const fromOverride = req.query.from || null;
    const toOverride = req.query.to || null;
    const scanStartedAt = new Date().toISOString();

    if (full) {
      await clearGmailEntries(req.user.accessToken, process.env.GOOGLE_SHEET_ID, req.user.refreshToken);
    }

    const lastScan = full ? null : await getLastScan(
  req.user.accessToken,
  process.env.GOOGLE_SHEET_ID,
  req.user.id,
  req.user.refreshToken
);
    
    const scanned = await scanJobEmails(req.user.accessToken, lastScan, full, fromOverride, toOverride);

    const existing = full ? [] : await getAllJobs(
      req.user.accessToken,
      process.env.GOOGLE_SHEET_ID,
      req.user.refreshToken
    );

    const existingKeys = new Set(
      existing.map(j => `${j.company.toLowerCase()}|${j.role.toLowerCase()}`)
    );

    const newJobs = scanned.filter(j => {
      const key = `${j.company.toLowerCase()}|${j.role.toLowerCase()}`;
      return !existingKeys.has(key);
    });

    // If a company now has an application email, remove its Referred entry
    const newApplicationCompanies = new Set(
      newJobs
        .filter(j => !['Leads', 'Referred'].includes(j.status))
        .map(j => j.company.toLowerCase())
    );

    const referredToRemove = existing.filter(j =>
    ['Referred', 'Leads'].includes(j.status) &&
    newApplicationCompanies.has(j.company.toLowerCase())
  );

    if (referredToRemove.length > 0) {
      await deleteJobs(
        req.user.accessToken,
        process.env.GOOGLE_SHEET_ID,
        referredToRemove.map(j => j.rowIndex),
        req.user.refreshToken
      );
      console.log(`[Scan] Removed ${referredToRemove.length} Referred entries now tracked as applications`);
    }

    await addJobs(
      req.user.accessToken,
      process.env.GOOGLE_SHEET_ID,
      newJobs,
      req.user.refreshToken
    );

    await setLastScan(
  req.user.accessToken,
  process.env.GOOGLE_SHEET_ID,
  req.user.id,
  scanStartedAt,
  req.user.refreshToken
);
    res.json({ scanned: scanned.length, added: newJobs.length, full, jobs: newJobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

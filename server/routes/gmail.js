const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { scanJobEmails } = require('../services/gmail');
const { addJobs, getAllJobs, deleteJobs } = require('../services/googleSheets');
const { getLastScan, setLastScan } = require('../services/scanState');
require('dotenv').config({ path: '../../.env' });

const router = express.Router();

router.use(requireAuth);

router.get('/scan-status', (req, res) => {
  const lastScan = getLastScan(req.user.id);
  res.json({ lastScan });
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
    const scanStartedAt = new Date().toISOString();

    // Full scan: wipe existing Gmail entries first, then re-import clean
    if (full) {
      await clearGmailEntries(req.user.accessToken, process.env.GOOGLE_SHEET_ID);
    }

    const lastScan = full ? null : getLastScan(req.user.id);
    const scanned = await scanJobEmails(req.user.accessToken, lastScan);

    // For incremental: deduplicate against what's already in the sheet
    // For full: sheet was just cleared so everything is new
    const existing = full ? [] : await getAllJobs(req.user.accessToken, process.env.GOOGLE_SHEET_ID);
    const existingKeys = new Set(existing.map(j => `${j.company.toLowerCase()}|${j.role.toLowerCase()}`));

    const newJobs = scanned.filter(j => {
      const key = `${j.company.toLowerCase()}|${j.role.toLowerCase()}`;
      return !existingKeys.has(key);
    });

    await addJobs(req.user.accessToken, process.env.GOOGLE_SHEET_ID, newJobs, req.user.refreshToken);
    setLastScan(req.user.id, scanStartedAt);

    res.json({ scanned: scanned.length, added: newJobs.length, full, jobs: newJobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

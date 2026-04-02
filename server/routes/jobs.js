const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { getAllJobs, addJob, updateJob, deleteJob } = require('../services/googleSheets');
const { getUserSheetId, setUserSheetId } = require('../services/userConfig');
require('dotenv').config({ path: '../../.env' });

const router = express.Router();
router.use(requireAuth);

function getSheetId(req) {
  return req.user.sheetId || req.headers['x-sheet-id'] || process.env.GOOGLE_SHEET_ID;
}

router.get('/my-sheet', async (req, res) => {
  try {
    const sheetId = await getUserSheetId(
      req.user.accessToken,
      req.user.refreshToken,
      req.user.id
    );
    res.json({ sheetId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/set-sheet', async (req, res) => {
  try {
    const { sheetId } = req.body;
    if (!sheetId) return res.status(400).json({ error: 'sheetId required' });
    await setUserSheetId(
      req.user.accessToken,
      req.user.refreshToken,
      req.user.id,
      sheetId
    );
    // Also attach to session so middleware picks it up immediately
    req.user.sheetId = sheetId;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const jobs = await getAllJobs(
      req.user.accessToken,
      getSheetId(req),
      req.user.refreshToken
    );
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    await addJob(
      req.user.accessToken,
      getSheetId(req),
      req.body,
      req.user.refreshToken
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:rowIndex', async (req, res) => {
  try {
    await updateJob(
      req.user.accessToken,
      getSheetId(req),
      parseInt(req.params.rowIndex),
      req.body,
      req.user.refreshToken
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:rowIndex', async (req, res) => {
  try {
    await deleteJob(
      req.user.accessToken,
      getSheetId(req),
      parseInt(req.params.rowIndex),
      req.user.refreshToken
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/insights', async (req, res) => {
  try {
    const jobs = await getAllJobs(
      req.user.accessToken,
      getSheetId(req),
      req.user.refreshToken
    );

    const rejected = jobs.filter(j => j.status === 'Rejected');
    if (rejected.length === 0) {
      return res.json({ insight: 'No rejections yet — keep applying!', count: 0 });
    }

    const Anthropic = require('@anthropic-ai/sdk').default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const summary = rejected.map(j =>
      `Company: ${j.company}, Role: ${j.role}, Date: ${j.dateApplied}`
    ).join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `I am job hunting and have received these rejections:\n\n${summary}\n\nIn 2 sentences max, what patterns do you see and what is one actionable tip to improve my success rate? Be specific and direct.`
      }]
    });

    const insight = response.content.find(b => b.type === 'text')?.text || '';
    res.json({ insight, count: rejected.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/setup-sheet', async (req, res) => {
  try {
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: req.user.accessToken,
      refresh_token: req.user.refreshToken,
    });
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: 'Job Application Tracker' },
        sheets: [
          { properties: { title: 'Sheet1' } },
          { properties: { title: 'Meta' } },
        ]
      }
    });

    const sheetId = spreadsheet.data.spreadsheetId;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1:G1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Company', 'Role', 'Date Applied', 'Status', 'Source', 'Notes', 'Link']]
      }
    });

    // Save sheetId to UserConfig
    await setUserSheetId(
      req.user.accessToken,
      req.user.refreshToken,
      req.user.id,
      sheetId
    );

    // Attach to session immediately
    req.user.sheetId = sheetId;

    res.json({
      sheetId,
      url: `https://docs.google.com/spreadsheets/d/${sheetId}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { getInterviewNotes, addInterviewNote, updateInterviewNote, deleteInterviewNote } = require('../services/interviewNotes');

const router = express.Router();
router.use(requireAuth);

function getSheetId(req) {
  return req.user.sheetId || req.headers['x-sheet-id'] || process.env.GOOGLE_SHEET_ID;
}

router.get('/:company', async (req, res) => {
  try {
    const company = decodeURIComponent(req.params.company);
    const notes = await getInterviewNotes(
      req.user.accessToken,
      getSheetId(req),
      company,
      req.user.refreshToken
    );
    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    await addInterviewNote(
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
    await updateInterviewNote(
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
    await deleteInterviewNote(
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

module.exports = router;

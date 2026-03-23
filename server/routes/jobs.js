const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { getAllJobs, addJob, updateJob, deleteJob } = require('../services/googleSheets');
require('dotenv').config({ path: '../../.env' });

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const jobs = await getAllJobs(req.user.accessToken, process.env.GOOGLE_SHEET_ID);
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    await addJob(req.user.accessToken, process.env.GOOGLE_SHEET_ID, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:rowIndex', async (req, res) => {
  try {
    await updateJob(req.user.accessToken, process.env.GOOGLE_SHEET_ID, parseInt(req.params.rowIndex), req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:rowIndex', async (req, res) => {
  try {
    await deleteJob(req.user.accessToken, process.env.GOOGLE_SHEET_ID, parseInt(req.params.rowIndex));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

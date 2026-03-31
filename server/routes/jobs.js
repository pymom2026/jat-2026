const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { getAllJobs, addJob, updateJob, deleteJob } = require('../services/googleSheets');
require('dotenv').config({ path: '../../.env' });

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const jobs = await getAllJobs(
      req.user.accessToken,
      process.env.GOOGLE_SHEET_ID,
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
      process.env.GOOGLE_SHEET_ID,
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
      process.env.GOOGLE_SHEET_ID,
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
      process.env.GOOGLE_SHEET_ID,
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
      process.env.GOOGLE_SHEET_ID,
      req.user.refreshToken
    );

    const rejected = jobs.filter(j => j.status === 'Rejected');
    if (rejected.length < 3) {
      return res.json({ insight: null, message: 'Not enough rejections to analyze yet.' });
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
module.exports = router;

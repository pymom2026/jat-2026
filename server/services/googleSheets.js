const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

async function getSheetsClient(accessToken, refreshToken) {
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

const SHEET_RANGE = 'Sheet1!A:G';
const HEADERS = ['Company', 'Role', 'Date Applied', 'Status', 'Source', 'Notes', 'Link'];

async function ensureHeaders(sheets, sheetId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1:G1'
  });
  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Sheet1!A1:G1',
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] }
    });
  }
}

async function getAllJobs(accessToken, sheetId, refreshToken) {
  const sheets = await getSheetsClient(accessToken, refreshToken);
  await ensureHeaders(sheets, sheetId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: SHEET_RANGE
  });
  const rows = res.data.values || [];
  if (rows.length <= 1) return [];
  return rows.slice(1).map((row, idx) => ({
    rowIndex: idx + 2,
    company: row[0] || '',
    role: row[1] || '',
    dateApplied: row[2] || '',
    status: row[3] || 'Applied',
    source: row[4] || '',
    notes: row[5] || '',
    link: row[6] || ''
  }));
}

async function addJob(accessToken, sheetId, job, refreshToken) {
  const sheets = await getSheetsClient(accessToken, refreshToken);
  const row = [
    job.company, job.role,
    job.dateApplied || new Date().toISOString().split('T')[0],
    job.status || 'Applied',
    job.source || '', job.notes || '', job.link || ''
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: SHEET_RANGE,
    valueInputOption: 'RAW',
    requestBody: { values: [row] }
  });
}

async function addJobs(accessToken, sheetId, jobs, refreshToken) {
  if (!jobs.length) return;
  const sheets = await getSheetsClient(accessToken, refreshToken);
  const rows = jobs.map(job => [
    job.company, job.role,
    job.dateApplied || new Date().toISOString().split('T')[0],
    job.status || 'Applied',
    job.source || '', job.notes || '', job.link || ''
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: SHEET_RANGE,
    valueInputOption: 'RAW',
    requestBody: { values: rows }
  });
}

async function updateJob(accessToken, sheetId, rowIndex, job, refreshToken) {
  const sheets = await getSheetsClient(accessToken, refreshToken);
  const row = [
    job.company, job.role, job.dateApplied,
    job.status, job.source || '', job.notes || '', job.link || ''
  ];
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `Sheet1!A${rowIndex}:G${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] }
  });
}

async function deleteJob(accessToken, sheetId, rowIndex, refreshToken) {
  return deleteJobs(accessToken, sheetId, [rowIndex], refreshToken);
}

async function deleteJobs(accessToken, sheetId, rowIndices, refreshToken) {
  if (!rowIndices.length) return;
  const sheets = await getSheetsClient(accessToken, refreshToken);
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const sheetIdNum = sheetMeta.data.sheets[0].properties.sheetId;
  const sorted = [...rowIndices].sort((a, b) => b - a);
  const requests = sorted.map(rowIndex => ({
    deleteDimension: {
      range: {
        sheetId: sheetIdNum,
        dimension: 'ROWS',
        startIndex: rowIndex - 1,
        endIndex: rowIndex
      }
    }
  }));
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { requests }
  });
}

async function getLastScan(accessToken, sheetId, userId, refreshToken) {
  try {
    const sheets = await getSheetsClient(accessToken, refreshToken);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Meta!A:B'
    });
    const rows = res.data.values || [];
    const row = rows.find(r => r[0] === `lastScan_${userId}`);
    return row ? row[1] : null;
  } catch {
    return null;
  }
}

async function setLastScan(accessToken, sheetId, userId, timestamp, refreshToken) {
  try {
    const sheets = await getSheetsClient(accessToken, refreshToken);
    // Check if row already exists
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Meta!A:B'
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === `lastScan_${userId}`);

    if (rowIndex === -1) {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Meta!A:B',
        valueInputOption: 'RAW',
        requestBody: { values: [[`lastScan_${userId}`, timestamp]] }
      });
    } else {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Meta!A${rowIndex + 1}:B${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[`lastScan_${userId}`, timestamp]] }
      });
    }
  } catch (err) {
    console.error('Error saving lastScan:', err.message);
  }
}

module.exports = { getAllJobs, addJob, addJobs, updateJob, deleteJob, deleteJobs, getLastScan, setLastScan };

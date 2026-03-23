const { google } = require('googleapis');

function getSheetsClient(accessToken) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: 'v4', auth });
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

async function getAllJobs(accessToken, sheetId) {
  const sheets = getSheetsClient(accessToken);
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

async function addJob(accessToken, sheetId, job) {
  const sheets = getSheetsClient(accessToken);
  const row = [
    job.company, job.role, job.dateApplied || new Date().toISOString().split('T')[0],
    job.status || 'Applied', job.source || '', job.notes || '', job.link || ''
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: SHEET_RANGE,
    valueInputOption: 'RAW',
    requestBody: { values: [row] }
  });
}

async function addJobs(accessToken, sheetId, jobs) {
  if (!jobs.length) return;
  const sheets = getSheetsClient(accessToken);
  const rows = jobs.map(job => [
    job.company, job.role, job.dateApplied || new Date().toISOString().split('T')[0],
    job.status || 'Applied', job.source || '', job.notes || '', job.link || ''
  ]);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: SHEET_RANGE,
    valueInputOption: 'RAW',
    requestBody: { values: rows }
  });
}

async function updateJob(accessToken, sheetId, rowIndex, job) {
  const sheets = getSheetsClient(accessToken);
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

async function deleteJob(accessToken, sheetId, rowIndex) {
  return deleteJobs(accessToken, sheetId, [rowIndex]);
}

// Delete multiple rows in a single API call. Rows are sorted descending so
// higher indices are removed first, keeping lower row indices stable.
async function deleteJobs(accessToken, sheetId, rowIndices) {
  if (!rowIndices.length) return;
  const sheets = getSheetsClient(accessToken);
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const sheetIdNum = sheetMeta.data.sheets[0].properties.sheetId;

  // Delete from bottom to top so indices don't shift mid-batch
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

module.exports = { getAllJobs, addJob, addJobs, updateJob, deleteJob, deleteJobs };

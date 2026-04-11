const { google } = require('googleapis');

const NOTES_TAB = 'Interviews';
const HEADERS = ['Company', 'Round', 'Date', 'Questions Asked', 'My Answers', 'What I\'d Do Better', 'Next Steps', 'Follow Up Date'];

async function getSheetsClient(accessToken, refreshToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

async function ensureInterviewTab(sheets, sheetId) {
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${NOTES_TAB}!A1`
    });
  } catch {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: NOTES_TAB } } }] }
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${NOTES_TAB}!A1:H1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] }
    });
    console.log('[Interviews] Created Interviews tab');
  }
}

async function getInterviewNotes(accessToken, sheetId, company, refreshToken) {
  const sheets = await getSheetsClient(accessToken, refreshToken);
  await ensureInterviewTab(sheets, sheetId);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${NOTES_TAB}!A:H`
  });
  const rows = res.data.values || [];
  if (rows.length <= 1) return [];
  return rows.slice(1)
    .map((row, idx) => ({
      rowIndex: idx + 2,
      company: row[0] || '',
      round: row[1] || '',
      date: row[2] || '',
      questions: row[3] || '',
      answers: row[4] || '',
      improvements: row[5] || '',
      nextSteps: row[6] || '',
      followUpDate: row[7] || '',
    }))
    .filter(r => r.company.toLowerCase() === company.toLowerCase());
}

async function addInterviewNote(accessToken, sheetId, note, refreshToken) {
  const sheets = await getSheetsClient(accessToken, refreshToken);
  await ensureInterviewTab(sheets, sheetId);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${NOTES_TAB}!A:H`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        note.company, note.round,
        note.date || new Date().toISOString().split('T')[0],
        note.questions || '', note.answers || '',
        note.improvements || '', note.nextSteps || '',
        note.followUpDate || ''
      ]]
    }
  });
}

async function updateInterviewNote(accessToken, sheetId, rowIndex, note, refreshToken) {
  const sheets = await getSheetsClient(accessToken, refreshToken);
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${NOTES_TAB}!A${rowIndex}:H${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        note.company, note.round, note.date,
        note.questions || '', note.answers || '',
        note.improvements || '', note.nextSteps || '',
        note.followUpDate || ''
      ]]
    }
  });
}

async function deleteInterviewNote(accessToken, sheetId, rowIndex, refreshToken) {
  const sheets = await getSheetsClient(accessToken, refreshToken);
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const interviewSheet = sheetMeta.data.sheets.find(s => s.properties.title === NOTES_TAB);
  if (!interviewSheet) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: interviewSheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex
          }
        }
      }]
    }
  });
}

module.exports = { getInterviewNotes, addInterviewNote, updateInterviewNote, deleteInterviewNote };

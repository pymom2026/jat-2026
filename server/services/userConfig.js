const { google } = require('googleapis');

const MASTER_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const CONFIG_TAB = 'UserConfig';

async function getConfigSheets(accessToken, refreshToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.sheets({ version: 'v4', auth: oauth2Client });
}

async function ensureUserConfigTab(sheets) {
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: MASTER_SHEET_ID,
      range: `${CONFIG_TAB}!A1`
    });
  } catch (err) {
    // Tab doesn't exist — create it
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: MASTER_SHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: { title: CONFIG_TAB }
          }
        }]
      }
    });
    console.log('[UserConfig] Created UserConfig tab');
  }
}

async function getUserSheetId(accessToken, refreshToken, userId) {
  try {
    const sheets = await getConfigSheets(accessToken, refreshToken);
    await ensureUserConfigTab(sheets);  // ← called here
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: MASTER_SHEET_ID,
      range: `${CONFIG_TAB}!A:B`
    });
    const rows = res.data.values || [];
    const row = rows.find(r => r[0] === userId);
    return row ? row[1] : null;
  } catch (err) {
    console.error('[UserConfig] Error reading:', err.message);
    return null;
  }
}

async function setUserSheetId(accessToken, refreshToken, userId, sheetId) {
  try {
    const sheets = await getConfigSheets(accessToken, refreshToken);
    await ensureUserConfigTab(sheets);  // ← called here
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: MASTER_SHEET_ID,
      range: `${CONFIG_TAB}!A:B`
    });
    const rows = res.data.values || [];
    const rowIndex = rows.findIndex(r => r[0] === userId);

    if (rowIndex === -1) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: MASTER_SHEET_ID,
        range: `${CONFIG_TAB}!A:B`,
        valueInputOption: 'RAW',
        requestBody: { values: [[userId, sheetId]] }
      });
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId: MASTER_SHEET_ID,
        range: `${CONFIG_TAB}!A${rowIndex + 1}:B${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [[userId, sheetId]] }
      });
    }
    console.log(`[UserConfig] Saved sheetId for user ${userId}`);
  } catch (err) {
    console.error('[UserConfig] Error writing:', err.message);
  }
}

module.exports = { getUserSheetId, setUserSheetId };

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../store/scanState.json');

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getLastScan(userId) {
  const state = readState();
  return state[userId] || null; // ISO timestamp string or null
}

function setLastScan(userId, timestamp) {
  const state = readState();
  state[userId] = timestamp;
  writeState(state);
}

module.exports = { getLastScan, setLastScan };

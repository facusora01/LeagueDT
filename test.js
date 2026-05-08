const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execAsync = util.promisify(exec);

async function test() {
  try {
    const { stdout } = await execAsync('wmic process where "name=\'LeagueClientUx.exe\'" get ExecutablePath');
    const lines = stdout.split('\n');
    console.log("RAW STDOUT:");
    console.log(stdout);
    for (const line of lines) {
      if (line.includes('LeagueClientUx.exe')) {
        const fullPath = line.trim();
        console.log('Detected Path:', path.dirname(fullPath));
        break;
      }
    }
  } catch(e) {
    console.error("Error:", e);
  }
}
test();

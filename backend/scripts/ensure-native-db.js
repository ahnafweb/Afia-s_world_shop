const { execFileSync } = require('child_process');

function canLoad() {
  try {
    const Database = require('better-sqlite3');
    const db = new Database(':memory:');
    db.prepare('SELECT 1').get();
    db.close();
    return true;
  } catch (error) {
    console.warn('better-sqlite3 native binding is unavailable. Attempting an automatic rebuild...');
    console.warn(error.message);
    return false;
  }
}

if (!canLoad()) {
  try {
    execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['rebuild', 'better-sqlite3'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('Unable to install the better-sqlite3 native binding automatically.');
    console.error('Run: npm install');
    process.exit(1);
  }

  if (!canLoad()) {
    console.error('better-sqlite3 is still unavailable after rebuild.');
    process.exit(1);
  }
}

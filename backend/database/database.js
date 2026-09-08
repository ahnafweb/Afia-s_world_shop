const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join(__dirname, 'shop.db'));

// Enable foreign key constraints and Write-Ahead Logging for better performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Ensure the schema is applied on startup
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

const userColumns = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
if (!userColumns.includes('email_verified')) db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1 CHECK(email_verified IN (0,1))");
if (!userColumns.includes('verification_code_hash')) db.exec('ALTER TABLE users ADD COLUMN verification_code_hash TEXT DEFAULT NULL');
if (!userColumns.includes('verification_expires_at')) db.exec('ALTER TABLE users ADD COLUMN verification_expires_at INTEGER DEFAULT NULL');

// Seed initial data if necessary
require('./seed')(db);

module.exports = db;

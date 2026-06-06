require('dotenv').config({ path: '../../.env' });

module.exports = {
  mysql: {
    host: '127.0.0.1',
    port: 3306,
    database: 'cocma_digital_db',
    user: 'cocma_digital_db',
    password: 'G8aMX7HRz4way7Be',
    multipleStatements: true,
    dateStrings: false,       // Return actual Date objects
    supportBigNumbers: true,
    bigNumberStrings: false,
    charset: 'utf8mb4',
  },
  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/cocoma_digital_db',
  },
  options: {
    dryRun: process.argv.includes('--dry-run'),
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    skipTables: ['failed_jobs', 'password_resets', 'personal_access_tokens'],
  },
};

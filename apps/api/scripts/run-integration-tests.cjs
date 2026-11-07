const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
require('dotenv').config({ quiet: true });
if (!process.env.DATABASE_URL)
  throw new Error('Configure DATABASE_URL; no fallback database credentials.');
const url = new URL(process.env.DATABASE_URL);
const schema = 'brewlite_auth_test_' + Date.now();
url.searchParams.set('schema', schema);
const env = {
  ...process.env,
  DATABASE_URL: url.toString(),
  AUTH_TEST_DATABASE_URL: url.toString(),
  JWT_SECRET: randomBytes(48).toString('hex'),
  FRONTEND_ORIGIN: 'http://localhost:3000',
  MOCK_PAYMENT_OUTCOME: 'SUCCESS',
};
console.log(
  'Isolated integration schema:',
  schema,
  '(retained for inspection; no reset/drop/seed)',
);
function run(args) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
run(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
run([
  '--experimental-vm-modules',
  'node_modules/jest/bin/jest.js',
  '--config',
  'test/jest-e2e.json',
  '--runInBand',
]);

// P2 invariants run separately, never against the public or auth fixture schema.
run(['scripts/run-p2-tests.cjs']);

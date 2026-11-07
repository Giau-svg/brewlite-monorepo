const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ quiet: true });
async function main() {
  const phase = process.argv[2] || 'p2';
  if (!['p2', 'p3'].includes(phase)) throw new Error('Unknown test phase');
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL required; no fallback credentials.');
  const operating = new URL(process.env.DATABASE_URL);
  const variable = `${phase.toUpperCase()}_TEST_DATABASE_URL`;
  const supplied = process.env[variable];
  const test = supplied ? new URL(supplied) : new URL(operating);
  if (!supplied) test.pathname = `/brewlite_${phase}_test_` + Date.now();
  test.searchParams.set('schema', 'public');
  const name = decodeURIComponent(test.pathname.slice(1));
  if (
    !new RegExp(`^brewlite_${phase}_test_[a-zA-Z0-9_]+$`).test(name) ||
    (operating.host === test.host && operating.pathname === test.pathname)
  )
    throw new Error(
      'A distinct test database is mandatory; never use an operating schema.',
    );
  if (!supplied) {
    const admin = new PrismaClient();
    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
    } finally {
      await admin.$disconnect();
    }
  }
  const env = {
    ...process.env,
    DATABASE_URL: test.toString(),
    [variable]: test.toString(),
    JWT_SECRET: randomBytes(48).toString('hex'),
    FRONTEND_ORIGIN: 'http://localhost:3000',
  };
  console.log('Dedicated test DATABASE:', name, '(retained; no reset/drop/seed)');
  function run(args) {
    const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
    if (result.status !== 0)
      throw new Error(
        'P2 test command failed; test database retained for inspection.',
      );
  }
  run(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
  run([
    '--experimental-vm-modules',
    'node_modules/jest/bin/jest.js',
    '--config',
    'test/jest-e2e.json',
    '--runInBand',
    phase === 'p2' ? 'p2-inventory.e2e-spec' : 'p3-cart.e2e-spec',
  ]);
}
main().catch(() => {
  console.error(
    'Isolated integration setup/tests failed. Inspect the error above; use a dedicated brewlite_p2_test_* or brewlite_p3_test_* database. No reset or fallback to operating data.',
  );
  process.exitCode = 1;
});

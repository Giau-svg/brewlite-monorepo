// Read-only audit: never prints row contents, credentials, or personal data.
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const db = new PrismaClient();
const digest = (value) => createHash('sha256').update(value).digest('hex');
async function audit() {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const tables =
        await tx.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> '_prisma_migrations' ORDER BY table_name`;
      const snapshots = {};
      for (const { table_name } of tables) {
        if (!/^[A-Za-z_]+$/.test(table_name))
          throw new Error('Unexpected table identifier');
        const rows = await tx.$queryRawUnsafe(
          `SELECT to_jsonb(t) AS row FROM public."${table_name}" t`,
        );
        const previous =
          process.argv[2] && fs.existsSync(process.argv[2])
            ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).snapshots?.[
                table_name
              ]
            : null;
        const columns =
          previous?.columns || Object.keys(rows[0]?.row || {}).sort();
        const canonical = rows
          .map(({ row }) =>
            JSON.stringify(
              Object.fromEntries(columns.map((key) => [key, row[key]])),
            ),
          )
          .sort();
        snapshots[table_name] = {
          count: rows.length,
          columns,
          sha256: digest(JSON.stringify(canonical)),
        };
      }
      const violations = await tx.$queryRaw`
      SELECT
       (SELECT count(*)::int FROM sizes WHERE "productId" IS NULL) AS "sizesWithoutProduct",
       (SELECT count(*)::int FROM sizes s LEFT JOIN products p ON p.id=s."productId" WHERE s."productId" IS NOT NULL AND p.id IS NULL) AS "sizeOrphans",
       (SELECT count(*)::int FROM (SELECT "productId",name FROM sizes GROUP BY "productId",name HAVING count(*)>1) d) AS "duplicateExactSizeNames",
       (SELECT count(*)::int FROM (SELECT "productId",lower(btrim(name)) FROM sizes GROUP BY "productId",lower(btrim(name)) HAVING count(*)>1) d) AS "duplicateFoldedSizeNames",
       (SELECT count(*)::int FROM sizes WHERE reserved<0 OR ("onHand" IS NULL AND reserved<>0) OR ("onHand" IS NOT NULL AND ("onHand"<0 OR reserved>"onHand"))) AS "invalidInventory",
       (SELECT count(*)::int FROM cart_items c JOIN sizes s ON s.id=c."sizeId" WHERE c."productId"<>s."productId") AS "cartSizeMismatch",
       (SELECT count(*)::int FROM order_items c JOIN sizes s ON s.id=c."sizeId" WHERE c."productId"<>s."productId") AS "orderSizeMismatch",
       (SELECT count(*)::int FROM (SELECT "orderId" FROM payments WHERE status='SUCCESS' GROUP BY "orderId" HAVING count(*)>1) d) AS "ordersWithMultipleSuccessfulPayments",
       (SELECT count(*)::int FROM cart_items WHERE "sizeId" IS NULL) AS "legacyCartItems",
       (SELECT count(*)::int FROM sizes WHERE "onHand" IS NULL) AS "uninitializedSizes"`;
      const applied =
        await tx.$queryRaw`SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations ORDER BY migration_name`;
      const migrations = applied.map((m) => ({
        name: m.migration_name,
        applied: !!m.finished_at && !m.rolled_back_at,
        checksumMatches:
          digest(
            fs.readFileSync(
              `prisma/migrations/${m.migration_name}/migration.sql`,
            ),
          ) === m.checksum,
      }));
      const constraints =
        await tx.$queryRaw`SELECT c.conrelid::regclass::text AS table_name,c.conname,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' ORDER BY 1,2`;
      const indexes =
        await tx.$queryRaw`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname`;
      return {
        snapshots,
        violations: violations[0],
        migrations,
        constraints,
        indexes,
      };
    },
    { isolationLevel: 'RepeatableRead', timeout: 30000 },
  );
}
audit()
  .then((result) => {
    const output = process.env.P2_AUDIT_OUTPUT;
    if (output) {
      if (fs.existsSync(output))
        throw new Error('Refuse to overwrite an audit file');
      fs.writeFileSync(output, JSON.stringify(result, null, 2));
    }
    let unchanged;
    let changedTables;
    if (process.argv[2]) {
      const before = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
      changedTables = Object.entries(before.snapshots)
        .filter(
          ([name, entry]) =>
            result.snapshots[name]?.count !== entry.count ||
            result.snapshots[name]?.sha256 !== entry.sha256,
        )
        .map(([name]) => name);
      unchanged = Object.entries(before.snapshots).every(
        ([name, entry]) =>
          result.snapshots[name]?.count === entry.count &&
          result.snapshots[name]?.sha256 === entry.sha256,
      );
    }
    if (unchanged === false) process.exitCode = 2;
    console.log(
      JSON.stringify(
        {
          tableCount: Object.keys(result.snapshots).length,
          counts: Object.fromEntries(
            Object.entries(result.snapshots).map(([name, value]) => [
              name,
              value.count,
            ]),
          ),
          violations: result.violations,
          migrations: result.migrations,
          originalRowsUnchanged: unchanged,
          changedTables,
          auditFile: output,
        },
        null,
        2,
      ),
    );
  })
  .catch(() => {
    console.error(
      'P2 read-only audit failed; no credentials or row contents printed.',
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

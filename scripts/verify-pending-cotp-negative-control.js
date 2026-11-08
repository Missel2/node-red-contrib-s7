'use strict';
// A passing expected-red control is evidence of a reproducible defect, NOT of
// correct client cleanup. Fail on wrong errors, skipped tests or harness timeout.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const report = path.join(ROOT, 'test-reports');
fs.mkdirSync(report, { recursive: true });
const result = spawnSync(process.execPath, [
    '--test', 'test/known-defects/s7-pending-disconnect.test.js'
], { cwd: ROOT, encoding: 'utf8', timeout: 20000 });
const log = (result.stdout || '') + '\n' + (result.stderr || '');
fs.writeFileSync(path.join(report, 'pending-cotp-expected-red.tap'), log);
if (result.error) throw result.error;
if (result.status !== 1 ||
    !log.includes('not ok 1 - pending COTP handshake disconnect must promptly close socket') ||
    !log.includes('public disconnect() must settle promptly during COTP setup') ||
    !log.includes('AssertionError') ||
    !log.includes('# fail 1') ||
    log.includes('HARNESS_TIMEOUT')) {
    process.stderr.write(log);
    throw new Error('The expected-red gate did not demonstrate its specific regression');
}
process.stdout.write('Original nodes7 disconnect-during-COTP defect reproduced; not fixed.\n');

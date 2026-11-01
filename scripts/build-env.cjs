const { execSync } = require('child_process');
const { createHash } = require('crypto');
const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');

const ROOT = resolve(__dirname, '..');

const readDotenv = () => {
  const file = resolve(ROOT, '.env');
  if (!existsSync(file)) {
    return {};
  }
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && !line.trim().startsWith('#')) {
      out[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return out;
};

const dotenv = readDotenv();
const env = key => {
  if (process.env[key] !== undefined) {
    return process.env[key];
  }
  if (dotenv[key] !== undefined) {
    return dotenv[key];
  }
  return '';
};

const buildId = (() => {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch (e) {
    return 'unknown';
  }
})();

const inlined = {
  DELEGATOR_BUILD_ID: buildId,
  DELEGATOR_REPORT_URL: env('DELEGATOR_REPORT_URL'),
  DELEGATOR_REPORT_TOKEN: env('DELEGATOR_REPORT_TOKEN'),
  DELEGATOR_CRASH_TEST: env('DELEGATOR_CRASH_TEST'),
  DELEGATOR_REPORT_TARGET: env('DELEGATOR_REPORT_TARGET'),
};

const cacheVersion = createHash('sha1')
  .update(JSON.stringify(inlined))
  .digest('hex')
  .slice(0, 12);

module.exports = { buildId, inlined, cacheVersion };

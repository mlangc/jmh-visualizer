const { execFileSync } = require('node:child_process');

const DESCRIBE_ARGS = ['describe', '--tags', '--long', '--dirty', '--match', '[0-9]*.[0-9]*.[0-9]*'];
const DESCRIBE_PATTERN = /^(.+)-(\d+)-g([0-9a-f]+)(-dirty)?$/;

function fromDescribe(described) {
  const match = DESCRIBE_PATTERN.exec(described.trim());
  if (!match) {
    return undefined;
  }

  const [, tag, count, hash, dirty] = match;
  if (count === '0' && !dirty) {
    return tag;
  }

  return `${tag}+dev.${count}.${hash}${dirty ? '.dirty' : ''}`;
}

function resolve() {
  try {
    const described = execFileSync('git', DESCRIBE_ARGS, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const version = fromDescribe(described);
    if (version) {
      return version;
    }
  } catch {
    // No usable git or no version tag, fall through
  }

  return `${require('./package.json').version}+dev`;
}

module.exports = { fromDescribe, resolve };

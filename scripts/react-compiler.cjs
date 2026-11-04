const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOG = process.env.REACT_COMPILER_LOG === '1';

const events = [];

const relative = file => path.relative(ROOT, file);

const rules = () => require('babel-plugin-react-compiler').LintRules;

const ruleFor = category => {
  const rule = rules().find(r => r.category === category);
  return rule ? rule.name : String(category);
};

const location = loc =>
  loc && typeof loc !== 'symbol' && loc.start
    ? { line: loc.start.line, column: loc.start.column + 1 }
    : null;

const levelFor = severity => {
  switch (severity) {
    case 'Error':
      return 'error';
    case 'Warning':
      return 'warning';
    default:
      return 'info';
  }
};

const describe = (file, event) => {
  const base = { file, kind: event.kind, fnLoc: location(event.fnLoc) };
  switch (event.kind) {
    case 'CompileError': {
      const detail = event.detail;
      const loc =
        typeof detail.primaryLocation === 'function'
          ? detail.primaryLocation()
          : detail.loc;
      return {
        ...base,
        level: levelFor(detail.severity),
        rule: ruleFor(detail.category),
        reason: detail.reason,
        description: detail.description || null,
        loc: location(loc) || base.fnLoc,
      };
    }
    case 'CompileDiagnostic':
      return {
        ...base,
        level: 'warning',
        rule: ruleFor(event.detail.category),
        reason: event.detail.reason,
        description: event.detail.description || null,
        loc: location(event.detail.loc) || base.fnLoc,
      };
    case 'CompileSkip':
      return {
        ...base,
        level: 'info',
        rule: 'skip',
        reason: event.reason,
        description: null,
        loc: location(event.loc) || base.fnLoc,
      };
    case 'PipelineError':
      return {
        ...base,
        level: 'error',
        rule: 'pipeline',
        reason: String(event.data),
        description: null,
        loc: base.fnLoc,
      };
    case 'CompileSuccess':
      return {
        ...base,
        level: 'success',
        rule: 'compiled',
        reason: event.fnName || '<anonymous>',
        description: null,
        loc: base.fnLoc,
      };
    default:
      return null;
  }
};

const logEvent = (filename, event) => {
  const file = filename ? relative(filename) : '<unknown>';
  const entry = describe(file, event);
  if (!entry) {
    return;
  }
  events.push(entry);
  if (LOG && entry.level !== 'success') {
    const where = entry.loc ? `:${entry.loc.line}:${entry.loc.column}` : '';
    console.warn(
      `[react-compiler] ${entry.level} ${file}${where} ${entry.rule}: ${entry.reason}`,
    );
  }
};

const isProjectSource = filename =>
  !filename.split(path.sep).includes('node_modules');

const plugin = (options = {}) => [
  require.resolve('babel-plugin-react-compiler'),
  {
    target: '19',
    sources: isProjectSource,
    logger: { logEvent },
    ...options,
  },
];

module.exports = { plugin, events, describe, ruleFor };

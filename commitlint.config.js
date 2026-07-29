// Dependabot's auto-generated commit messages routinely trip config-conventional's
// defaults: headers grow past 100 chars once a directory path or dependency-group
// name is included, and bodies quote third-party changelog text we don't control.
// Relax both instead of fighting an ever-recurring CI failure on every bump PR.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 150],
    'body-max-line-length': [0, 'always'],
  },
};

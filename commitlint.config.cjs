// Relaxes config-conventional's defaults for long headers and for bodies quoting third-party
// text such as a changelog. .githooks/commit-msg and pull_request.yml's pr-title-lint apply the
// same header limit.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 200],
    'body-max-line-length': [0, 'always'],
  },
};

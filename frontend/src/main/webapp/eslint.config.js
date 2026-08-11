const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettierConfig = require('eslint-config-prettier');
const boundaries = require('eslint-plugin-boundaries');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', '.angular/**', 'out-tsc/**']
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
      prettierConfig
    ],
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.json',
        sourceType: 'module'
      }
    },
    processor: angular.processInlineTemplates,
    plugins: {
      boundaries
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.ts', '.js']
        }
      },
      'boundaries/elements': [
        {type: 'module', pattern: 'src/app/modules/*', capture: ['module']},
        {type: 'common', pattern: 'src/app/common'},
        {type: 'api', pattern: 'src/app/api'}
      ]
    },
    rules: {
      // feature modules may only depend on common/api and their own module - never on a sibling module
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: {element: {type: 'module'}},
              allow: {to: {element: {types: ['common', 'api']}}}
            },
            {
              from: {element: {type: 'module'}},
              allow: {to: {element: {type: 'module', captured: {module: '{{ from.element.captured.module }}'}}}}
            },
            {
              from: {element: {types: ['common', 'api']}},
              allow: {to: {element: {types: ['common', 'api']}}}
            }
          ]
        }
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'tafel',
          style: 'kebab-case'
        }
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'tafel',
          style: 'camelCase'
        }
      ],

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-definitions': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'forbid',
          trailingUnderscore: 'forbid'
        }
      ],

      'arrow-body-style': 'error',
      'brace-style': ['error', '1tbs'],
      curly: 'error',
      'eol-last': 'error',
      eqeqeq: ['error', 'smart'],
      'guard-for-in': 'error',
      'max-len': ['error', {code: 140}],
      'no-bitwise': 'error',
      'no-caller': 'error',
      'no-console': [
        'error',
        {
          allow: [
            'log', 'warn', 'error', 'dir', 'timeLog', 'assert', 'clear',
            'count', 'countReset', 'group', 'groupEnd', 'table', 'dirxml',
            'groupCollapsed', 'Console', 'profile', 'profileEnd', 'timeStamp',
            'context', 'createTask'
          ]
        }
      ],
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-new-wrappers': 'error',
      'no-restricted-imports': ['error', 'rxjs/Rx'],
      'no-throw-literal': 'error',
      'no-trailing-spaces': 'error',
      'no-undef-init': 'error',
      'no-unused-labels': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      quotes: ['error', 'single'],
      radix: 'error',
      semi: ['error', 'always'],
      'spaced-comment': ['error', 'always', {markers: ['/']}]
    }
  },
  {
    // HTTP calls must go through a dedicated service in app/api, not HttpClient directly
    files: ['src/app/modules/**/*.ts', 'src/app/common/**/*.ts'],
    ignores: ['src/app/common/security/authentication.service.ts', '**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/common/http',
              importNames: ['HttpClient'],
              message: 'Inject the dedicated *ApiService from app/api instead of using HttpClient directly.'
            }
          ],
          patterns: ['rxjs/Rx']
        }
      ]
    }
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      // The static half of this project's accessibility checking. The `lighthouse` job's `pages`
      // sweep enforces axe at score 1, but only over what a route actually renders for the e2e
      // fixtures - it never opens a dialog, never expands a panel, and never sees a component that
      // no route in its matrix reaches. These rules read the templates instead, so a click handler
      // on an element nothing can focus is a lint error at authoring time rather than a defect
      // nobody's audit happens to load.
      ...angular.configs.templateAccessibility
    ],
    rules: {
      // The two spellings of this project's e2e hook are not interchangeable, and picking the
      // wrong one fails silently rather than at compile time.
      //   - `testid` is the DOM attribute. It is what `cy.byTestId()` and every Cypress/unit-spec
      //     selector match (`[testid="..."]`), so it is the form every native and Material element
      //     carries, statically or as `[attr.testid]`.
      //   - `testId` is the name of the Angular `input()` on the `tafel-*` wrapper components that
      //     render the attribute themselves (tafel-dialog, tafel-info-tooltip, tafel-counter-input,
      //     tafel-reorder-handle, and `testIdPrefix` on tafel-employee-search-create).
      // Angular input names are case-sensitive, so `<tafel-dialog testid="x">` never reaches the
      // input, and `<input testId="x">` is a hook no selector looks for - neither is an error until
      // an e2e spec can't find its element.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Element:not([name=/^tafel-/]) > :matches(TextAttribute, BoundAttribute)[name=/^testId/]',
          message:
            'Use the lowercase DOM attribute `testid` (or `[attr.testid]`) here - that is what cy.byTestId() ' +
            'and the spec selectors match. `testId` is only the Angular input name on the tafel-* components.'
        },
        {
          selector: 'Element[name=/^tafel-/] > :matches(TextAttribute, BoundAttribute)[name=/^testid/]',
          message:
            'A tafel-* component takes its test hook through the case-sensitive Angular input `testId` ' +
            '(e.g. testId="my-dialog" or [testId]="expr"); a lowercase `testid` never reaches it.'
        }
      ]
    }
  }
);

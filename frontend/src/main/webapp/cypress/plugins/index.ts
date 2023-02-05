// cypress/plugins/index.ts

import {cypressBrowserPermissionsPlugin} from 'cypress-browser-permissions';

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  config = cypressBrowserPermissionsPlugin(on, config);
  return config;
};

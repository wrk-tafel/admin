import {defineConfig} from 'cypress'

export default defineConfig({
  builder: '@cypress/schematic:cypress',
  viewportWidth: 1280,
  viewportHeight: 1024,
  videoCompression: false,
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.js')(on, config)
    },
    baseUrl: 'http://localhost:4200/',
    experimentalSessionAndOrigin: true,
  },
})

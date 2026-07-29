// Shared viewport presets for responsive e2e coverage. The desktop baseline (1024x768) is
// set globally in cypress.config.ts; these are for specs that additionally need to verify
// behavior below the app's mobile breakpoint (max-width: 1023.98px, see MOBILE_BREAKPOINT
// in default-layout.component.ts).
export const PHONE_VIEWPORT: Cypress.ViewportPreset = 'iphone-7';

// 768px wide - lands exactly on the app's Tailwind `md:` breakpoint used by several
// pages' table/card layout switches, while still being below the 1024px desktop breakpoint.
export const TABLET_VIEWPORT: Cypress.ViewportPreset = 'ipad-2';

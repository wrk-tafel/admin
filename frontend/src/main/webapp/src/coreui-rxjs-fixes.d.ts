// Temporary module declarations to satisfy packages referencing deep paths inside node_modules
// These are migration-time shims and should be removed/refined once upstream packages are updated.

declare module 'node_modules/rxjs/dist/types' {
  export * from 'rxjs';
}

declare module 'node_modules/rxjs/dist/types/index' {
  export * from 'rxjs';
}

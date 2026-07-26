/* SystemJS module definition */
/* eslint-disable no-var */
declare var module: NodeModule;

interface NodeModule {
  id: string;
}

// Fix for Chart.js "Cannot find module" errors
declare module 'node_modules/chart.js/dist/types/basic' {
  import {ChartTypeRegistry} from 'chart.js';
  export interface AnyObject { [key: string]: any }
  export {ChartTypeRegistry};
}

declare module 'node_modules/chart.js/dist/types/utils' {
  // This recreates an internal chart.js type that ng2-charts' typings look for
  export type _DeepPartialObject<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
      ? _DeepPartialObject<U>[]
      : T[P] extends object
        ? _DeepPartialObject<T[P]>
        : T[P];
  };
}

import {EffectiveTheme} from '../../../common/theme/theme.service';

/**
 * Chart.js draws onto a canvas, which no stylesheet reaches, so its text and grid colours come from
 * here instead. The defaults (a mid gray) are drawn for a white background and fall below AA
 * contrast on the dark surface.
 */
export function chartColors(theme: EffectiveTheme): { text: string; grid: string } {
  return theme === 'dark'
    ? {text: '#c5ccd8', grid: 'rgba(255,255,255,.14)'}
    : {text: '#4b5563', grid: 'rgba(0,0,0,.1)'};
}

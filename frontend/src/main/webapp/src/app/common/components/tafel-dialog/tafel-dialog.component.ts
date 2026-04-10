import {Component, HostBinding, input} from '@angular/core';
import {CommonModule, NgClass} from '@angular/common';
import {MatDialogModule} from '@angular/material/dialog';

/**
 * Reusable base dialog component that provides a consistent structural layout
 * for all MatDialog instances across the application.
 *
 * The component renders a colored header (based on `type`), a content slot,
 * and an actions slot. Consumers project their own content into the slots
 * via `ng-content`.
 *
 * Usage as a MatDialog body:
 * ```html
 * <tafel-dialog type="info" title="My Dialog" testid="my-dialog">
 *   <div tafel-dialog-content>
 *     <p>Body content goes here.</p>
 *   </div>
 *   <div tafel-dialog-actions>
 *     <button cButton>OK</button>
 *     <button cButton color="secondary">Cancel</button>
 *   </div>
 * </tafel-dialog>
 * ```
 *
 * Header color classes match the CSS variables defined in `_custom.scss`:
 *  - `dialog-header-info` (blue)
 *  - `dialog-header-warning` (yellow/amber)
 *  - `dialog-header-danger` (red)
 *  - `dialog-header-success` (green)
 */
@Component({
  selector: 'tafel-dialog',
  imports: [MatDialogModule, NgClass, CommonModule],
  templateUrl: './tafel-dialog.component.html'
})
export class TafelDialogComponent {
  @HostBinding('attr.testid') get hostTestId() {
    return this.testId() || null;
  }

  /**
   * The visual style of the dialog header.
   * Determines the background color via the corresponding `dialog-header-<type>` CSS class.
   */
  type = input<'info' | 'warning' | 'danger' | 'success'>('info');

  /**
   * The title text displayed in the dialog header.
   */
  title = input.required<string>();

  /**
   * A base testid prefix for Cypress E2E testing.
   */
  testId = input<string>('');
}

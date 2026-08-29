import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {DecimalPipe} from '@angular/common';
import {MatDialog} from '@angular/material/dialog';
import {FoodCategoryCreateDialogComponent} from './dialogs/food-category-create-dialog.component';
import {FormControl, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import {CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray} from '@angular/cdk/drag-drop';
import {FoodCategoriesApiService, FoodCategory} from '../../../../api/food-categories-api.service';
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';
import {registerSvgIcons} from '../../../../common/util/svg-icon.util';
import addIcon from '@material-symbols/svg-400/outlined/add-fill.svg';
import checkIcon from '@material-symbols/svg-400/outlined/check-fill.svg';
import closeIcon from '@material-symbols/svg-400/outlined/close-fill.svg';
import editIcon from '@material-symbols/svg-400/outlined/edit-fill.svg';
import package2Icon from '@material-symbols/svg-400/outlined/package_2-fill.svg';
import {
  TafelReorderHandleComponent
} from '../../../../common/components/tafel-reorder-handle/tafel-reorder-handle.component';
import {
  ReorderFeedbackService
} from '../../../../common/components/tafel-reorder-handle/reorder-feedback.service';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatTooltipModule} from '@angular/material/tooltip';
import {RouterLink} from '@angular/router';
import {
  EnabledFilter,
  matchesEnabledFilter
} from '../../../../common/components/tafel-enabled-filter/enabled-filter';
import {
  TafelEnabledFilterComponent
} from '../../../../common/components/tafel-enabled-filter/tafel-enabled-filter.component';
import {
  TafelEnabledToggleComponent
} from '../../../../common/components/tafel-enabled-toggle/tafel-enabled-toggle.component';
import {
  TafelInfoTooltipComponent
} from '../../../../common/components/tafel-info-tooltip/tafel-info-tooltip.component';

@Component({
  selector: 'tafel-settings-food-categories',
  templateUrl: 'settings-food-categories.component.html',
  imports: [
    MatCard,
    MatCardActions,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    MatTable,
    MatHeaderCellDef,
    MatIcon,
    MatButton,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    TafelReorderHandleComponent,
    MatTooltipModule,
    TafelEnabledFilterComponent,
    TafelEnabledToggleComponent,
    TafelInfoTooltipComponent,
    RouterLink,
    DecimalPipe
  ]
})
export class SettingsFoodCategoriesComponent {
  private readonly registerIcons = registerSvgIcons({
    add: addIcon,
    check: checkIcon,
    close: closeIcon,
    edit: editIcon,
    package_2: package2Icon
  });

  private readonly foodCategoriesApiService = inject(FoodCategoriesApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly reorderFeedback = inject(ReorderFeedbackService);
  private readonly dialog = inject(MatDialog);

  private _foodCategories = signal<FoodCategory[]>([]);
  protected foodCategories = this._foodCategories;
  displayedColumns = ['drag', 'active', 'name', 'weightPerUnit', 'actions'];

  protected readonly loaded = signal(false);
  protected readonly enabledFilter = signal<EnabledFilter>('ALL');
  /**
   * A deactivated category is never deleted, so the list only ever grows - the filter is what keeps
   * the working list to the categories the Warenerfassung actually offers.
   */
  protected readonly visibleFoodCategories = computed(() =>
    this._foodCategories().filter(category => matchesEnabledFilter(category.enabled, this.enabledFilter()))
  );
  protected readonly enabledCount = computed(() => this._foodCategories().filter(category => category.enabled).length);
  protected readonly totalCount = computed(() => this._foodCategories().length);

  /**
   * Shown at the weight column of both layouts: the number turns recorded units into the kilograms
   * every warehouse statistic is built from, and a food collection item keeps the weight it was
   * recorded with - so an edit here never rewrites a distribution that is already closed.
   */
  protected readonly weightExplanation =
    'Rechnet die erfassten Einheiten in Kilogramm um und bestimmt damit die Warenmenge jeder ' +
    'Statistik. Eine Änderung wirkt ab der nächsten Erfassung - bereits erfasste Mengen behalten ' +
    'das Gewicht, mit dem sie erfasst wurden.';

  protected editingId = signal<number | null>(null);
  protected nameControl = new FormControl<string>('', {nonNullable: true});
  // Same validators as the create dialog's weightPerUnit field - without them, an invalid value
  // (empty, or negative) failed only as a bare "Speichern fehlgeschlagen" once the backend rejected
  // it, rather than as an inline validation error while it is still being edited. See #3530.
  protected weightPerUnitControl = new FormControl<number | null>(null, [Validators.required, Validators.min(0)]);
  private nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private nameInputMobile = viewChild<ElementRef<HTMLInputElement>>('nameInputMobile');

  constructor() {
    this.loadFoodCategories();

    effect(() => {
      this.nameInput()?.nativeElement.focus();
      this.nameInputMobile()?.nativeElement.focus();
    });
  }

  private loadFoodCategories() {
    this.foodCategoriesApiService.getAllFoodCategories().subscribe({
      next: data => {
        this._foodCategories.set(data);
        this.loaded.set(true);
      },
      error: () => {
        this.loaded.set(true);
        this.toastr.error('Fehler beim Laden der Waren-Kategorien', 'Fehler');
      }
    });
  }

  protected onFilterChanged(filter: EnabledFilter) {
    this.enabledFilter.set(filter);
  }

  protected startEdit(category: FoodCategory) {
    this.editingId.set(category.id);
    this.nameControl.setValue(category.name);
    this.weightPerUnitControl.setValue(category.weightPerUnit);
  }

  protected cancelEdit() {
    this.editingId.set(null);
  }

  protected saveEdit(category: FoodCategory) {
    if (this.weightPerUnitControl.invalid) {
      this.weightPerUnitControl.markAsTouched();
      return;
    }

    const updated: FoodCategory = {
      ...category,
      name: this.nameControl.value,
      weightPerUnit: this.weightPerUnitControl.value
    };

    this.foodCategoriesApiService.updateFoodCategory(updated.id, updated).subscribe({
      next: () => {
        this.toastr.success('Lebensmittelkategorie gespeichert', 'Erfolgreich');
        this.editingId.set(null);
        this.loadFoodCategories();
      },
      error: () => this.toastr.error('Speichern fehlgeschlagen', 'Fehler')
    });
  }

  protected toggleFoodCategoryVisibility(category: FoodCategory, enabled: boolean) {
    const updatedCategory = {
      ...category,
      enabled: enabled
    };

    const observer = {
      next: () => {
        this.toastr.success(`Lebensmittelkategorie ${category.name} geändert`, 'Erfolgreich');
        this.loadFoodCategories();
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern', 'Fehler');
      }
    };
    this.foodCategoriesApiService.updateFoodCategory(updatedCategory.id, updatedCategory).subscribe(observer);
  }

  /**
   * Without this the table rebuilds every row whenever the list is replaced - which a reorder does
   * twice, optimistically and again from the response - and the rebuild throws away the row that
   * currently has focus. Keyed by id, the existing rows are moved instead, so the handle the
   * keyboard is on survives its own reorder.
   */
  protected trackById(index: number, item: {id: number}): number {
    return item.id;
  }

  protected drop(event: CdkDragDrop<FoodCategory[]>) {
    this.reorder(event.previousIndex, event.currentIndex, false);
  }

  /** The keyboard path of the same reordering - `offset` is -1 for one place up, 1 for one down. */
  protected moveFoodCategory(index: number, offset: number) {
    const targetIndex = index + offset;
    const moved = this.reorder(index, targetIndex, true);

    if (moved) {
      this.reorderFeedback.announce(`Waren-Kategorie ${moved.name}`, targetIndex, this.visibleFoodCategories().length);
    }
  }

  /**
   * Both indices count the *displayed* categories, which under an active filter are only some of
   * them - they are translated into the full list before the move, so a category filtered out of
   * view keeps its place instead of being reordered by a move it isn't part of. Moving past such a
   * category therefore jumps over it, which is exactly what the visible list shows afterwards.
   *
   * `keepFocusOnHandle` only for the keyboard path: after a drag the pointer, not the keyboard, is
   * where the user is, and pulling focus onto the handle there would be a focus ring out of nowhere.
   */
  private reorder(fromVisibleIndex: number, toVisibleIndex: number, keepFocusOnHandle: boolean): FoodCategory | undefined {
    const visible = this.visibleFoodCategories();
    if (toVisibleIndex < 0 || toVisibleIndex >= visible.length) {
      return undefined;
    }

    const reordered = [...(this.foodCategories())];
    const fromIndex = reordered.findIndex(category => category.id === visible[fromVisibleIndex].id);
    const toIndex = reordered.findIndex(category => category.id === visible[toVisibleIndex].id);

    moveItemInArray(reordered, fromIndex, toIndex);
    this._foodCategories.set(reordered); // optimistic, updates in the background
    // The handles are keyed by the position in the displayed list, not in the full one.
    if (keepFocusOnHandle) {
      this.reorderFeedback.refocusHandle(`dragFoodCategoryHandle-${toVisibleIndex}`);
    }

    this.foodCategoriesApiService.reorderFoodCategories(reordered.map(category => category.id)).subscribe({
      next: data => {
        this._foodCategories.set(data);
        // The response replaces every record, so the focused handle is a new element by now.
        if (keepFocusOnHandle) {
          this.reorderFeedback.refocusHandle(`dragFoodCategoryHandle-${toVisibleIndex}`);
        }
      },
      error: () => {
        this.toastr.error('Fehler beim Ändern der Reihenfolge', 'Fehler');
        this.loadFoodCategories();
      }
    });

    return reordered[toIndex];
  }

  protected addFoodCategory() {
    const dialogRef = this.dialog.open(FoodCategoryCreateDialogComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((created: FoodCategory | undefined) => {
      if (created) {
        this.foodCategoriesApiService.createFoodCategory(created).subscribe({
          next: () => {
            this.toastr.success('Lebensmittelkategorie erstellt', 'Erfolgreich');
            this.loadFoodCategories();
          },
          error: () => this.toastr.error('Erstellen fehlgeschlagen', 'Fehler')
        });
      }
    });
  }

}

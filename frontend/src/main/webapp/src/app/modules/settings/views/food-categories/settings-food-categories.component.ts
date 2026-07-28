import {Component, inject, signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {FoodCategoryEditDialogComponent} from './dialogs/food-category-edit-dialog.component';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
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
import {FoodCategoriesApiService, FoodCategory} from '../../../../api/food-categories-api.service';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {MatButton} from '@angular/material/button';
import {faEye, faEyeSlash, faPencil, faPlus} from '@fortawesome/free-solid-svg-icons';
import {TafelToastrService} from '../../../../common/components/tafel-toastr/tafel-toastr.service';

@Component({
  selector: 'tafel-settings-food-categories',
  templateUrl: 'settings-food-categories.component.html',
  imports: [
    MatCard,
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
    FaIconComponent,
    MatButton
  ]
})
export class SettingsFoodCategoriesComponent {
  private readonly foodCategoriesApiService = inject(FoodCategoriesApiService);
  private readonly toastr = inject(TafelToastrService);
  private readonly dialog = inject(MatDialog);

  private _foodCategories = signal<FoodCategory[]>([]);
  protected foodCategories = this._foodCategories;
  displayedColumns = ['active', 'name', 'weightPerUnit', 'returnItem', 'sortOrder', 'actions'];

  constructor() {
    this.loadFoodCategories();
  }

  private loadFoodCategories() {
    this.foodCategoriesApiService.getAllFoodCategories().subscribe({
      next: data => this._foodCategories.set(data),
      error: () => this.toastr.error('Fehler beim Laden der Lebensmittelkategorien', 'Fehler')
    });
  }

  protected editFoodCategory(category: FoodCategory) {
    const dialogRef = this.dialog.open(FoodCategoryEditDialogComponent, {
      data: {category},
      width: '600px'
    });

    dialogRef.afterClosed().subscribe((updated: FoodCategory | undefined) => {
      if (updated) {
        this.foodCategoriesApiService.updateFoodCategory(updated.id!, updated).subscribe({
          next: () => {
            this.toastr.success('Lebensmittelkategorie gespeichert', 'Erfolgreich');
            this.loadFoodCategories();
          },
          error: () => this.toastr.error('Speichern fehlgeschlagen', 'Fehler')
        });
      }
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
    this.foodCategoriesApiService.updateFoodCategory(updatedCategory.id!, updatedCategory).subscribe(observer);
  }

  protected addFoodCategory() {
    const dialogRef = this.dialog.open(FoodCategoryEditDialogComponent, {
      data: {category: undefined as any},
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

  protected readonly faPencil = faPencil;
  protected readonly faEye = faEye;
  protected readonly faEyeSlash = faEyeSlash;
  protected readonly faPlus = faPlus;
}

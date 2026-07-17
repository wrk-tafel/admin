import {Component, effect, input, output} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';

@Component({
    selector: 'tafel-pagination',
    templateUrl: 'tafel-pagination.component.html',
    imports: [
        MatButtonModule
    ]
})
export class TafelPaginationComponent {
  align = input<'start' | 'center' | 'end' | ''>('');
  size = input<'sm' | 'lg'>();
  paginationData = input<TafelPaginationData | null | undefined>();
  pageChanged = output<number>();

  maxPage: number = 1;
  currentPage: number = 1;
  text: string = '';

  constructor() {
    effect(() => {
      const data = this.paginationData();
      if (!data) {
        return;
      }

      this.currentPage = data.currentPage;
      this.maxPage = data.totalPages;

      const start = ((data.currentPage - 1) * data.pageSize) + 1;
      const end = (start - 1) + data.count;
      this.text = `${start} - ${end} von ${data.totalCount}`;
    });
  }

  selectFirstPage() {
    this.pageChanged.emit(1);
  }

  selectPreviousPage() {
    this.pageChanged.emit(Math.max(1, this.currentPage - 1));
  }

  selectNextPage() {
    this.pageChanged.emit(Math.min(this.maxPage, this.currentPage + 1));
  }

  selectLastPage() {
    this.pageChanged.emit(this.maxPage);
  }

}

export interface TafelPaginationData {
  count: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

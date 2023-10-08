import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'tafel-pagination',
  templateUrl: 'tafel-pagination.component.html'
})
export class TafelPaginationComponent {
  @Input() align: 'start' | 'center' | 'end' | '' = '';
  @Input() size?: 'sm' | 'lg';
  @Output() pageChanged = new EventEmitter<number>();

  maxPage: number;
  currentPage: number;
  text: string;

  @Input() set paginationData(paginationData: TafelPaginationData) {
    this.currentPage = paginationData.currentPage + 1;
    this.maxPage = paginationData.totalPages;

    const start = (paginationData.currentPage * paginationData.pageSize) + 1;
    const end = (start - 1) + paginationData.count;
    this.text = `${start} - ${end} von ${paginationData.totalCount}`;
  }

  selectFirstPage() {
    this.emitPageChange(1);
  }

  selectPreviousPage() {
    this.emitPageChange(Math.max(1, this.currentPage - 1));
  }

  selectNextPage() {
    this.emitPageChange(Math.min(this.maxPage, this.currentPage + 1));
  }

  selectLastPage() {
    this.emitPageChange(this.maxPage);
  }

  private emitPageChange(pageIndex: number) {
    this.pageChanged.emit(pageIndex - 1);
  }

}

export interface TafelPaginationData {
  count: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

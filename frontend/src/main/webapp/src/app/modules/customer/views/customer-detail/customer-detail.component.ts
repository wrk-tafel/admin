import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import * as moment from 'moment';
import {FileHelperService} from '../../../../common/util/file-helper.service';
import {
    CustomerAddressData,
    CustomerApiService,
    CustomerData,
    CustomerIssuer,
    Gender,
    GenderLabel
} from '../../../../api/customer-api.service';
import {HttpResponse} from '@angular/common/http';
import {
    CustomerNoteApiService,
    CustomerNoteItem,
    CustomerNotesResponse
} from '../../../../api/customer-note-api.service';
import {ToastService, ToastType} from '../../../../common/views/default-layout/toasts/toast.service';
import {TafelPaginationData} from '../../../../common/components/tafel-pagination/tafel-pagination.component';

@Component({
    selector: 'tafel-customer-detail',
    templateUrl: 'customer-detail.component.html'
})
export class CustomerDetailComponent implements OnInit {
    customerData: CustomerData;
    customerNotes: CustomerNoteItem[];
    customerNotesPaginationData: TafelPaginationData;

    newNoteText: string;
    lockReasonText: string;

    showDeleteCustomerModal = false;
    showAddNewNoteModal = false;
    showAllNotesModal = false;
    showLockCustomerModal = false;

    constructor(
        private activatedRoute: ActivatedRoute,
        private customerApiService: CustomerApiService,
        private customerNoteApiService: CustomerNoteApiService,
        private fileHelperService: FileHelperService,
        private router: Router,
        private toastService: ToastService
    ) {
    }

    ngOnInit(): void {
        this.customerData = this.activatedRoute.snapshot.data.customerData;
        const customerNotesResponse: CustomerNotesResponse = this.activatedRoute.snapshot.data.customerNotes;
        this.processCustomerNoteResponse(customerNotesResponse);
    }

    printMasterdata() {
        this.customerApiService.generatePdf(this.customerData.id, 'MASTERDATA')
            .subscribe((response) => this.processPdfResponse(response));
    }

    printIdCard() {
        this.customerApiService.generatePdf(this.customerData.id, 'IDCARD')
            .subscribe((response) => this.processPdfResponse(response));
    }

    printCombined() {
        this.customerApiService.generatePdf(this.customerData.id, 'COMBINED')
            .subscribe((response) => this.processPdfResponse(response));
    }

    formatAddressLine1(address: CustomerAddressData): string {
        let addressLine = address.street;
        if (address.houseNumber) {
            addressLine += ' ' + address.houseNumber;
        }
        if (address.stairway) {
            addressLine += ', Stiege ' + address.stairway;
        }
        if (address.door) {
            addressLine += ', Top ' + address.door;
        }
        return addressLine;
    }

    formatAddressLine2(address: CustomerAddressData): string {
        return address.postalCode + ' ' + address.city;
    }

    getAge(birthDate: Date): number {
        if (birthDate) {
            return moment().diff(birthDate, 'years');
        }
        return null;
    }

    formatIssuer(issuer: CustomerIssuer): string {
        if (issuer) {
            return 'von ' + issuer.personnelNumber + ' ' + issuer.firstname + ' ' + issuer.lastname;
        }
        return '';
    }

    editCustomer() {
        this.router.navigate(['/kunden/bearbeiten', this.customerData.id]);
    }

    isValid(): boolean {
        return !moment(this.customerData.validUntil).startOf('day').isBefore(moment().startOf('day'));
    }

    deleteCustomer() {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        const observer = {
            next: (response) => {
                this.toastService.showToast({type: ToastType.SUCCESS, title: 'Kunde wurde gelöscht!'});
                this.router.navigate(['/kunden/suchen']);
            },
            error: error => {
                this.showDeleteCustomerModal = false;
                this.toastService.showToast({type: ToastType.ERROR, title: 'Löschen fehlgeschlagen!'});
            },
        };
        this.customerApiService.deleteCustomer(this.customerData.id).subscribe(observer);
    }

    prolongCustomer(countMonths: number) {
        const newValidUntilDate = moment(this.customerData.validUntil).add(countMonths, 'months').endOf('day').toDate();
        const updatedCustomerData = {
            ...this.customerData,
            validUntil: newValidUntilDate
        };

        this.customerApiService.updateCustomer(updatedCustomerData).subscribe(customerData => {
            this.customerData = customerData;
        });
    }

    invalidateCustomer() {
        const updatedCustomerData = {
            ...this.customerData,
            validUntil: moment().subtract(1, 'day').endOf('day').toDate()
        };

        this.customerApiService.updateCustomer(updatedCustomerData).subscribe(customerData => {
            this.customerData = customerData;
        });
    }

    lockCustomer() {
        const updatedCustomerData: CustomerData = {
            ...this.customerData,
            locked: true,
            lockReason: this.lockReasonText
        };

        this.customerApiService.updateCustomer(updatedCustomerData).subscribe(customerData => {
            this.customerData = customerData;
            this.lockReasonText = undefined;
            this.showLockCustomerModal = false;
        });
    }

    unlockCustomer() {
        const updatedCustomerData: CustomerData = {
            ...this.customerData,
            locked: false
        };

        this.customerApiService.updateCustomer(updatedCustomerData).subscribe(customerData => {
            this.customerData = customerData;
        });
    }

    addNewNote() {
        const sanitizedText = this.newNoteText.replace(/\n/g, '<br/>');
        this.customerNoteApiService.createNewNote(this.customerData.id, sanitizedText).subscribe(newNoteItem => {
            this.customerNotes.unshift(newNoteItem);
            this.newNoteText = undefined;
            this.showAddNewNoteModal = false;
        });
    }

    getGenderLabel(gender?: Gender): string {
        if (gender) {
            return GenderLabel[gender];
        }
        return '-';
    }

    getCustomerNotes(page: number) {
        this.customerNoteApiService.getNotesForCustomer(this.customerData.id, page).subscribe((response) => {
            this.processCustomerNoteResponse(response);
        });
    }

    private processCustomerNoteResponse(response: CustomerNotesResponse) {
        console.log("RESPONSE", response)

        this.customerNotes = response.items;
        this.customerNotesPaginationData = {
            count: response.items.length,
            totalCount: response.totalCount,
            currentPage: response.currentPage,
            totalPages: response.totalPages,
            pageSize: response.pageSize
        };
    }

    private processPdfResponse(response: HttpResponse<Blob>) {
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition.split(';')[1].split('filename')[1].split('=')[1].trim();
        this.fileHelperService.downloadFile(filename, response.body);
    }

}

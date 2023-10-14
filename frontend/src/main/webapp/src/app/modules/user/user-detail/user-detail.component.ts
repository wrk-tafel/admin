import {Component, inject, OnInit} from '@angular/core';
import {UserApiService, UserData} from '../../../api/user-api.service';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastService, ToastType} from '../../../common/views/default-layout/toasts/toast.service';

@Component({
    selector: 'tafel-user-detail',
    templateUrl: 'user-detail.component.html'
})
export class UserDetailComponent implements OnInit {
    private activatedRoute = inject(ActivatedRoute);
    private userApiService = inject(UserApiService);
    private router = inject(Router);
    private toastService = inject(ToastService);

    userData: UserData;

    ngOnInit(): void {
        this.userData = this.activatedRoute.snapshot.data.userData;
    }

    disableUser() {
        this.changeUserState(false);
    }

    enableUser() {
        this.changeUserState(true);
    }

    private changeUserState(enabled: boolean) {
        const modifiedUser = {
            ...this.userData,
            enabled: enabled
        };

        this.userApiService.updateUser(modifiedUser).subscribe(updatedUser => {
            this.userData = updatedUser;
        });
    }

    deleteUser() {
        const observer = {
            next: (response) => {
                this.toastService.showToast({type: ToastType.SUCCESS, title: 'Benutzer wurde gelöscht!'});
                this.router.navigate(['/benutzer/suchen']);
            },
            error: error => {
                this.toastService.showToast({type: ToastType.ERROR, title: 'Löschen fehlgeschlagen!'});
            },
        };
        this.userApiService.deleteUser(this.userData.id).subscribe(observer);
    }

    editUser() {
        this.router.navigate(['/benutzer/bearbeiten', this.userData.id]);
    }

    formatPermissions(): string {
        return this.userData?.permissions
            .map(permission => permission.title)
            .join(', ');
    }

}

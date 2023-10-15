import {NgModule} from '@angular/core';
import {TafelIfPermissionDirective} from './security/tafel-if-permission.directive';
import {PasswordChangeFormComponent} from './views/passwordchange-form/passwordchange-form.component';
import {ReactiveFormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {
    BgColorDirective,
    PaginationModule,
    ProgressBarComponent,
    ProgressComponent,
    ToastBodyComponent,
    ToastComponent,
    ToasterComponent,
    ToastHeaderComponent
} from '@coreui/angular';
import {TafelToasterComponent} from './views/default-layout/toasts/tafel-toaster.component';
import {TafelToastComponent} from './views/default-layout/toasts/toast/tafel-toast.component';
import {TafelIfDistributionActiveDirective} from './directive/tafel-if-distribution-active.directive';
import {TafelPaginationComponent} from './components/tafel-pagination/tafel-pagination.component';
import {RouterLink} from '@angular/router';

@NgModule({
    declarations: [
        TafelIfPermissionDirective,
        TafelIfDistributionActiveDirective,
        PasswordChangeFormComponent,
        TafelToasterComponent,
        TafelToastComponent,
        TafelPaginationComponent
    ],
    imports: [
        ReactiveFormsModule,
        CommonModule,
        ToastComponent,
        ToastHeaderComponent,
        ToastBodyComponent,
        BgColorDirective,
        ToasterComponent,
        ProgressComponent,
        ProgressBarComponent,
        PaginationModule,
        RouterLink
    ],
    exports: [
        TafelIfPermissionDirective,
        TafelIfDistributionActiveDirective,
        PasswordChangeFormComponent,
        TafelToasterComponent,
        TafelPaginationComponent
    ]
})
export class TafelCommonModule {
}

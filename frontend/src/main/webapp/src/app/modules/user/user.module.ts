import {NgModule} from '@angular/core';
import {UserPasswordChangeComponent} from './user-passwordchange/user-passwordchange.component';
import {UserRoutingModule} from './user-routing.module';
import {
    BadgeComponent,
    BgColorDirective,
    ButtonCloseDirective,
    ButtonDirective,
    CardBodyComponent,
    CardComponent,
    CardFooterComponent,
    CardHeaderComponent,
    ColComponent,
    DropdownComponent,
    DropdownDividerDirective,
    DropdownItemDirective,
    DropdownMenuDirective,
    DropdownToggleDirective, FormSelectDirective,
    ModalBodyComponent,
    ModalComponent,
    ModalFooterComponent,
    ModalHeaderComponent,
    NavComponent, NavItemComponent, NavLinkDirective, RoundedDirective,
    RowComponent, TabContentComponent,
    TableDirective, TabPaneComponent
} from '@coreui/angular';
import {TafelCommonModule} from '../../common/tafel-common.module';
import {CommonModule} from '@angular/common';
import {UserSearchComponent} from './user-search/user-search.component';
import {ReactiveFormsModule} from '@angular/forms';
import {UserDetailComponent} from "./user-detail/user-detail.component";

@NgModule({
    imports: [
        CommonModule,
        TafelCommonModule,
        UserRoutingModule,
        CardFooterComponent,
        CardHeaderComponent,
        CardComponent,
        CardBodyComponent,
        ButtonDirective,
        ColComponent,
        ReactiveFormsModule,
        RowComponent,
        TableDirective,
        BgColorDirective,
        ButtonCloseDirective,
        DropdownComponent,
        DropdownDividerDirective,
        DropdownItemDirective,
        DropdownMenuDirective,
        DropdownToggleDirective,
        ModalBodyComponent,
        ModalComponent,
        ModalFooterComponent,
        ModalHeaderComponent,
        NavComponent,
        NavItemComponent,
        NavLinkDirective,
        RoundedDirective,
        TabContentComponent,
        TabPaneComponent,
        BadgeComponent,
        FormSelectDirective
    ],
  declarations: [
    UserPasswordChangeComponent,
    UserDetailComponent,
    UserSearchComponent
  ]
})
export class UserModule {
}

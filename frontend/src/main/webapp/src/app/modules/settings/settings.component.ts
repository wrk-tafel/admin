import {Component, inject, OnInit} from '@angular/core';
import {
  ButtonDirective,
  CardBodyComponent,
  CardComponent,
  CardFooterComponent,
  CardHeaderComponent,
  ColComponent,
  NavComponent,
  NavItemComponent,
  NavLinkDirective,
  RoundedDirective,
  RowComponent,
  TabContentComponent,
  TabContentRefDirective,
  TabPaneComponent
} from '@coreui/angular';
import {IconDirective} from '@coreui/icons-angular';
import {cilEnvelopeClosed} from '@coreui/icons';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {RouterLink} from '@angular/router';
import {CurrencyPipe, DatePipe, NgForOf, NgIf} from '@angular/common';
import {MailRecipientSetting, SettingsApiService} from '../../api/settings-api.service';

@Component({
  selector: 'tafel-settings',
  templateUrl: 'settings.component.html',
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardBodyComponent,
    CardFooterComponent,
    RowComponent,
    ColComponent,
    IconDirective,
    ButtonDirective,
    FaIconComponent,
    NavComponent,
    NavItemComponent,
    NavLinkDirective,
    TabContentRefDirective,
    RouterLink,
    CurrencyPipe,
    DatePipe,
    NgForOf,
    NgIf,
    RoundedDirective,
    TabContentComponent,
    TabPaneComponent
  ],
  standalone: true
})
export class SettingsComponent implements OnInit {
  private readonly settingsApiService = inject(SettingsApiService);
  protected readonly cilEnvelopeClosed = cilEnvelopeClosed;

  mailRecipientSettings: MailRecipientSetting[];

  ngOnInit(): void {
    this.settingsApiService.getMailRecipients().subscribe(response => {
      this.mailRecipientSettings = response.settings;
    })
  }

  save() {
    // TODO
  }

}

import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CoreDataComponent } from './coredata.component';
import { CoreDataRoutingModule } from './coredata-routing.module';

@NgModule({
  imports: [
    FormsModule,
    CoreDataRoutingModule
  ],
  declarations: [CoreDataComponent]
})
export class CoreDataModule { }

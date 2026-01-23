import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMixDialogComponent } from './add-mix-dialog.component';

describe('AddMixDialogComponent', () => {
  let component: AddMixDialogComponent;
  let fixture: ComponentFixture<AddMixDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMixDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddMixDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

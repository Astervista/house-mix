import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConstantEditDialogComponent } from './constant-edit-dialog.component';

describe('ConstantEditDialogComponent', () => {
  let component: ConstantEditDialogComponent;
  let fixture: ComponentFixture<ConstantEditDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConstantEditDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConstantEditDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

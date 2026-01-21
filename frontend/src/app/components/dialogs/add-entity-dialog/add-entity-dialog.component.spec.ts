import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEntityDialogComponent } from './add-entity-dialog.component';

describe('AddGroupDialogComponent', () => {
  let component: AddEntityDialogComponent;
  let fixture: ComponentFixture<AddEntityDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddEntityDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddEntityDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

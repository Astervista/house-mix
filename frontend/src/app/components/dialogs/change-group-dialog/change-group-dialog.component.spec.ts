import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeGroupDialogComponent } from './change-group-dialog.component';

describe('ChangeGroupDialogComponent', () => {
  let component: ChangeGroupDialogComponent;
  let fixture: ComponentFixture<ChangeGroupDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangeGroupDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangeGroupDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

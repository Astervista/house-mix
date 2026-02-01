import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteEntityDialogComponent } from './delete-entity-dialog.component';

describe('DeleteGroupDialogComponent', () => {
  let component: DeleteEntityDialogComponent;
  let fixture: ComponentFixture<DeleteEntityDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteEntityDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteEntityDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

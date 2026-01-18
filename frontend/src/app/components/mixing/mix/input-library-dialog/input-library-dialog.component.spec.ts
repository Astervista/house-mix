import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputLibraryDialogComponent } from './input-library-dialog.component';

describe('InputLibraryDialogComponent', () => {
  let component: InputLibraryDialogComponent;
  let fixture: ComponentFixture<InputLibraryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputLibraryDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InputLibraryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

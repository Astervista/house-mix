import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NodeLibraryDialogComponent } from './node-library-dialog.component';

describe('NodeLibraryDialogComponent', () => {
  let component: NodeLibraryDialogComponent;
  let fixture: ComponentFixture<NodeLibraryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeLibraryDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NodeLibraryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

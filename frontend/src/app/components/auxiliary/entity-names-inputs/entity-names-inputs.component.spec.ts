import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntityNamesInputsComponent } from './entity-names-inputs.component';

describe('EntityNamesInputsComponent', () => {
  let component: EntityNamesInputsComponent;
  let fixture: ComponentFixture<EntityNamesInputsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityNamesInputsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntityNamesInputsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

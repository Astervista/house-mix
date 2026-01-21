import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EntityLocationInputComponent } from './entity-location-input.component';

describe('EntityPositionInputComponent', () => {
  let component: EntityLocationInputComponent;
  let fixture: ComponentFixture<EntityLocationInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EntityLocationInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EntityLocationInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

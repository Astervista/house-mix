import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ColorTempPickerComponent} from './color-temp-picker.component';

describe('ColorTempPickerComponent', () => {
    let component: ColorTempPickerComponent;
    let fixture: ComponentFixture<ColorTempPickerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
                                                 imports: [ColorTempPickerComponent]
                                             })
                     .compileComponents();

        fixture   = TestBed.createComponent(ColorTempPickerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

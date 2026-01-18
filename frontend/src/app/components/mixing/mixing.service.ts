import {Injectable} from '@angular/core';
import {BasePath, Get} from '../../utils/networking/decorators';
import {Mix} from '@common/mixing/mix/mix';
import {HttpClient} from '@angular/common/http';

@Injectable({
                providedIn: 'root'
            })
@BasePath('/mixing')
export class MixingService {

    constructor(private httpClient: HttpClient) { }

    @Get('/mix/id/:id/', { result: Mix, resultIsArray: false })
    public getMix!: (pathParams: { id: number }) => Promise<Mix>;

}

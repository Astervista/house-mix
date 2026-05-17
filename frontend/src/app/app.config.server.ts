/**
 * @ignore
 * @module
 */
import { provideServerRendering } from '@angular/ssr';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { appConfig } from './app.config';

/**
 * @ignore
 */
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
  ]
};

export
/**
 * @ignore
 */
const config = mergeApplicationConfig(appConfig, serverConfig);

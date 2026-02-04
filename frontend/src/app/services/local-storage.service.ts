import { Injectable } from '@angular/core';

@Injectable({
              providedIn: 'root',
            })
export class LocalStorageService {


  public setItem<T>(key: LocalStorageObject<T>, value: T, serializer: (value: T) => unknown = t => t): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
      const jsonValue = JSON.stringify(serializer(value));
      localStorage.setItem(key.name, jsonValue);
    } catch (error) {
      console.error('Error saving to local storage', error);
    }
  }

  public getItem<T>(key: LocalStorageObject<T>, deserializer: (value: unknown) => T = t=> t as T): T {
    if (typeof window === 'undefined') {
      return key.defaultValue;
    }
    try {
      const value = localStorage.getItem(key.name);
      return (value != null) ? deserializer(JSON.parse(value)) : key.defaultValue;
    } catch (error) {
      console.error('Error reading from local storage', error);
      return key.defaultValue;
    }
  }

  public removeItem(keyName: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.removeItem(keyName);
  }

  public clear(): void {
    if (typeof window === 'undefined') {
      return;
    }
    localStorage.clear();
  }
}


export class LocalStorageObject<T> {

    constructor(
        public readonly name: string,
        public readonly defaultValue: T
    ) {
    }

}

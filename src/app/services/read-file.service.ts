import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class ReadFileService {
    constructor(private http: HttpClient) {}

    readFileFromLocal(fileName: string) {
        return this.http.get(`app/files/${fileName}`, { responseType: 'blob'});
    }
}

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ReadFileService } from './services/read-file.service';
// import { Workbook, Worksheet } from 'exceljs';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
    timsheetCsv: any;
    eksadFileWeek1!: File;
    eksadFileWeek2!: File;

    timesheet!: FormGroup;

    @ViewChild('uploadFile', { static: true, read: ElementRef })
    uploadFileEl!: ElementRef;

    constructor(private readFileService: ReadFileService, private fb: FormBuilder) {}

    ngOnInit(): void {
        this.timesheet = this.fb.group({
            name: new FormControl('', Validators.required),
            week: new FormControl('1', Validators.required),
            month: new FormControl('', Validators.required),
        });
        // TODO change to week 1
        this.readFileService.readFileFromLocal('1.txt').subscribe((data: Blob) => {
            this.eksadFileWeek1 = new File([data], 'Eksad Timesheet');
        });
        // TODO change to week 2
        this.readFileService.readFileFromLocal('1.txt').subscribe((data: Blob) => {
            this.eksadFileWeek2 = new File([data], 'Eksad Timesheet');
        });
    }

    openFileExplorer() {
        this.uploadFileEl.nativeElement.click();
    }

    // onXlsxLoaded(file: File, wb: Workbook) {
    //     if (typeof FileReader !== 'undefined') {
    //         const reader = new FileReader();
    //         reader.onload = (e: any) => {
    //             const ab: ArrayBuffer = e.target.result;
    //             wb.xlsx.load(ab).then(workbook => {});
    //         };

    //         reader.readAsArrayBuffer(file);
    //     }
    // }

    onFileSelected({ files }: any) {
        if (typeof FileReader !== 'undefined') {
            // const wb = new Workbook();
            // const reader = new FileReader();
            // reader.onload = (e: any) => {
            //     const ab: ArrayBuffer = e.target.result;
            //     wb.xlsx.load(ab).then(workbook => {});
            //     this.timsheetCsv = e.target.result;
            // };
            // reader.readAsArrayBuffer(files[0]);
        }
    }
}

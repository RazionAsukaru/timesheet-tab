import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Row, Workbook } from 'exceljs';
import { NgxCsvParser, NgxCSVParserError } from 'ngx-csv-parser';
import { BehaviorSubject } from 'rxjs';
import { Datepicker } from 'vanillajs-datepicker';
import { ReadFileService } from './services/read-file.service';
import * as moment from 'moment';

enum Record {
    workItemType = 'Work Item Type',
    id = 'ID',
    title = 'Title',
    assignedTo = 'Assigned To',
    state = 'State',
    areaPath = 'Area Path',
    startDate = 'Start Date',
    originalEstimate = 'Original Estimate',
    remainingWork = 'Remaining Work',
    completedWork = 'Completed Work',
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit {
    templateFile!: File;

    datePicker!: Datepicker;

    csvRecords: any[] = [];
    timesheetWb: Workbook | null = null;

    username: string = '';
    existingDate: Date = new Date();

    xlsxSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    @ViewChild('uploadTemplateFile', { static: true, read: ElementRef })
    uploadTemplateFileEl!: ElementRef;
    @ViewChild('uploadAzureFile', { static: true, read: ElementRef })
    uploadAzureFileEl!: ElementRef;
    @ViewChild('datePicker') datePickerEl!: ElementRef;

    constructor(
        private readFileService: ReadFileService,
        private fb: FormBuilder,
        private ngxCsvParser: NgxCsvParser
    ) {}

    ngAfterViewInit(): void {}

    ngOnInit(): void {}

    openTemplateFileExplorer() {
        this.uploadTemplateFileEl.nativeElement.click();
    }

    openAzureFileExplorer() {
        this.uploadAzureFileEl.nativeElement.click();
    }

    async loadXlsx(file: File) {
        if (typeof FileReader !== 'undefined') {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                const ab: ArrayBuffer = e.target.result;
                const wb = new Workbook();
                wb.xlsx.load(ab).then((workbook: Workbook) => {
                    const found = workbook.worksheets.find((d: any) => d.name.includes('PM Tools 1'));
                    const sheet = workbook.getWorksheet(found ? found.id : 0);

                    // Set Username
                    this.username = sheet.getCell('C2').value?.toString() || '';
                    this.existingDate = sheet.getCell('B7').model.value as Date;

                    sheet.eachRow((row: Row, rowIndex) => {
                        if (rowIndex >= 7 && !!row?.model?.cells) {
                            let temp = [];
                            if (!!row.getCell(2).value) {
                                const taskDate = !!row.getCell(2).result
                                    ? (row.getCell(2).result as Date).getDate()
                                    : (row.getCell(2).value as Date).getDate();
                                temp = this.csvRecords.filter(
                                    (d: any) => new Date(d[Record.startDate]).getDate() === taskDate
                                );
                            }
                            temp.forEach((d: any, idx: number) => {
                                sheet.getCell(`D${rowIndex + idx}`).value = d[Record.title];
                                sheet.getCell(`E${rowIndex + idx}`).value = d[Record.title];
                                sheet.getCell(`F${rowIndex + idx}`).value = 2;
                                sheet.getCell(`G${rowIndex + idx}`).value = +d[Record.originalEstimate];
                                sheet.getCell(`H${rowIndex + idx}`).value = +d[Record.completedWork];
                                sheet.getCell(`I${rowIndex + idx}`).value = 1;
                            });
                        }
                    });
                    this.timesheetWb = wb;
                });
            };

            reader.readAsArrayBuffer(file);
        }
    }

    async exportXlsx(workbook: Workbook | null) {
        if (!workbook) return;
        const uint8Array = await workbook.xlsx.writeBuffer();
        const blob = new Blob([uint8Array], { type: 'application/octet-binary' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PMtools - ${moment(this.existingDate).format('MMMM - yyyy')} - Week ${
            this.existingDate.getDate() === 1 ? '1 & 2' : '3 & 4'
        } - ${this.username}.xlsx`;
        a.click();
        a.remove();
    }

    onAzureFileSelected({ files }: any) {
        if (typeof FileReader !== 'undefined') {
            this.ngxCsvParser
                .parse(files[0], { header: true, delimiter: ',', encoding: 'utf8' })
                .pipe()
                .subscribe({
                    next: (result: any): void => {
                        this.csvRecords = [...result];
                        console.log(result);
                        console.log(
                            !!this.templateFile,
                            this.csvRecords.length,
                            !!this.templateFile && this.csvRecords.length
                        );
                        if (!!this.templateFile && this.csvRecords.length) {
                            this.loadXlsx(this.templateFile);
                        }
                    },
                    error: (error: NgxCSVParserError): void => {
                        console.log('Error', error);
                    },
                });
        }
    }
    onTemplateFileSelected({ files }: any) {
        this.templateFile = files[0];
        if (!!this.templateFile && this.csvRecords.length) {
            this.loadXlsx(this.templateFile);
        }
    }
}

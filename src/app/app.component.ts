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
    timsheetCsv: any;
    eksadFileWeek1!: File;
    eksadFileWeek2!: File;

    datePicker!: Datepicker;
    timesheet!: FormGroup;

    csvRecords: any;
    timesheetWb: Workbook | null = null;

    xlsxSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    @ViewChild('uploadFile', { static: true, read: ElementRef })
    uploadFileEl!: ElementRef;
    @ViewChild('datePicker') datePickerEl!: ElementRef;

    constructor(
        private readFileService: ReadFileService,
        private fb: FormBuilder,
        private ngxCsvParser: NgxCsvParser
    ) {}

    ngAfterViewInit(): void {
        this.initiateDatePicker();
        'Test'.toLowerCase;
    }

    ngOnInit(): void {
        this.timesheet = this.fb.group({
            name: new FormControl('', Validators.required),
            week: new FormControl('1', Validators.required),
            month: new FormControl('', Validators.required),
        });

        this.readFileService.readFileFromLocal('week-1&2.xlsx').subscribe((data: Blob) => {
            this.eksadFileWeek1 = new File([data], 'Eksad Timesheet');
        });

        this.readFileService.readFileFromLocal('week-3&4.xlsx').subscribe((data: Blob) => {
            this.eksadFileWeek2 = new File([data], 'Eksad Timesheet');
        });
    }

    initiateDatePicker() {
        this.datePicker = new Datepicker(this.datePickerEl.nativeElement, {
            autohide: true,
            pickLevel: 1,
            format: 'MM - yyyy',
        });
        this.datePicker.setDate([new Date()]);
        this.timesheet.get('month')?.setValue(this.datePicker.getDate());
    }

    onDateChange({ detail }: any) {
        this.timesheet.get('month')?.setValue(detail.date);
    }

    openFileExplorer() {
        this.uploadFileEl.nativeElement.click();
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

                    // Set Date
                    const existingDate = sheet.getCell('B7').model.value as Date;
                    const newDate = this.timesheet.get('month')?.value as Date;
                    sheet.getCell('B7').model.value = new Date(existingDate.setMonth(newDate.getMonth()));

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
                                sheet.getCell(`G${rowIndex + idx}`).value = d[Record.originalEstimate];
                                sheet.getCell(`H${rowIndex + idx}`).value = d[Record.completedWork];
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
        a.download = `PMtools - ${moment(this.timesheet.get('month')?.value).format('MMMM - yyyy')} - Week ${
            this.timesheet.get('week')?.value === '1' ? '1 & 2' : '3 & 4'
        } - ${this.timesheet.get('name')?.value}.xlsx`;
        a.click();
        a.remove();
    }

    onFileSelected({ files }: any) {
        if (typeof FileReader !== 'undefined') {
            this.ngxCsvParser
                .parse(files[0], { header: true, delimiter: ',', encoding: 'utf8' })
                .pipe()
                .subscribe({
                    next: (result: any): void => {
                        const selectedMonth = (this.timesheet.get('month')?.value as Date).getMonth();
                        if (new Date(result[0][Record.startDate]).getMonth() == selectedMonth) {
                            this.csvRecords = result;
                            this.loadXlsx(
                                this.timesheet.get('week')?.value == 1 ? this.eksadFileWeek1 : this.eksadFileWeek2
                            );
                        } else {
                            console.error('Wrong Month!', new Date(result[0][Record.startDate]).getMonth(), selectedMonth);
                        }
                    },
                    error: (error: NgxCSVParserError): void => {
                        console.log('Error', error);
                    },
                });
        }
    }
}

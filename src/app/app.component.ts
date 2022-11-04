import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Cell, Row, Workbook, Worksheet } from 'exceljs';
import { NgxCsvParser, NgxCSVParserError } from 'ngx-csv-parser';
import { BehaviorSubject, debounceTime } from 'rxjs';
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
export class AppComponent implements OnInit {
    eksadFileWeek1!: File;
    eksadFileWeek2!: File;
    _file!: any;

    datePicker!: Datepicker;
    timesheetForm!: FormGroup;

    csvRecords: any = [];
    timesheetWb: Workbook | null = null;

    xlsxSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    errorMsg = '';

    @ViewChild('uploadFile', { static: true, read: ElementRef })
    uploadFileEl!: ElementRef;

    constructor(
        private readFileService: ReadFileService,
        private fb: FormBuilder,
        private ngxCsvParser: NgxCsvParser
    ) { }

    ngOnInit(): void {
        this.timesheetForm = this.fb.group({
            name: new FormControl('', Validators.required),
            week: new FormControl('1', Validators.required),
            month: new FormControl<Date | null>(null, Validators.required),
        });

        this.readFileService.readFileFromLocal('week-1&2.xlsx').subscribe((data: Blob) => {
            this.eksadFileWeek1 = new File([data], 'Eksad Timesheet');
        }, err => {
            console.error('err: ', err);
        });

        this.readFileService.readFileFromLocal('week-3&4.xlsx').subscribe((data: Blob) => {
            this.eksadFileWeek2 = new File([data], 'Eksad Timesheet');
        }, err => {
            console.error('err: ', err);
        });

        this.name?.valueChanges.pipe(debounceTime(300)).subscribe(d => {
            this.onFileSelected(this._file);
        });

        this.week?.valueChanges.pipe(debounceTime(300)).subscribe(d => {
            this.onFileSelected(this._file);
        });
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
                    const pmTools: Worksheet | undefined = workbook.worksheets.find((d: any) =>
                        d.name.includes('PM Tools 1')
                    );
                    this.processPMTools(pmTools);
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
        a.download = `PMtools - ${moment(this.month?.value).format('MMMM - yyyy')} - Week ${this.week?.value === '1' ? '1 & 2' : '3 & 4'
            } - ${this.name?.value}.xlsx`;
        a.click();
        a.remove();
    }

    processPMTools(pmTools: Worksheet | undefined) {
        if (!pmTools) return;

        // Set Date
        const existingDate = pmTools.getCell('B7').model.value as Date;
        const newDate = this.month?.value as Date;
        pmTools.getCell('B7').model.value = new Date(existingDate.setMonth(newDate.getMonth()));

        if (!!!this.name?.value) {
            this.name?.setValue(this.csvRecords[0][Record.assignedTo].split(' <')[0], { emitEvent: false });
        }

        // Set Name
        pmTools.getCell('C2').value = this.name?.value;

        // Set Period
        const mth = moment(this.month?.value).format('MMM');

        pmTools.getCell('C4').value = (pmTools.getCell('C4').value as string).replace(/Mar/g, mth);

        pmTools.eachRow((row: Row, rowIndex) => {
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
                    pmTools.getCell(`D${rowIndex + idx}`).value = d[Record.title];
                    pmTools.getCell(`E${rowIndex + idx}`).value = d[Record.title];
                    pmTools.getCell(`F${rowIndex + idx}`).value = 2;
                    pmTools.getCell(`G${rowIndex + idx}`).value = +d[Record.originalEstimate];
                    pmTools.getCell(`H${rowIndex + idx}`).value = +d[Record.completedWork];
                    pmTools.getCell(`I${rowIndex + idx}`).value = 1;
                });
            }
        });
    }

    onFileSelected(response: any) {
        const { files } = response;
        this._file = response;
        if (typeof FileReader !== 'undefined') {
            this.ngxCsvParser
                .parse(files[0], { header: true, delimiter: ',', encoding: 'utf8' })
                .pipe()
                .subscribe({
                    next: (result: any): void => {
                        this.csvRecords = result;
                        this.month?.setValue(new Date(result[0][Record.startDate]));
                        this.loadXlsx(
                            this.week?.value == 1 ? this.eksadFileWeek1 : this.eksadFileWeek2
                        );
                    },
                    error: (error: NgxCSVParserError): void => {
                        console.error('Error', error);
                        this.timesheetWb = null;
                    },
                });
        }
    }

    get week() {
        return this.timesheetForm.get('week');
    }
    get month() {
        return this.timesheetForm.get('month');
    }
    get name() {
        return this.timesheetForm.get('name');
    }
}

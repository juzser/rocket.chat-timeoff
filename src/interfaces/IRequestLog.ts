export enum RequestType {
    OFF = 'off',
    LATE = 'late',
    END_SOON = 'endSoon',
    WFH = 'wfh',
}

export enum TimePeriod {
    DAY = 'day',
    MORNING = 'morning',
    AFTERNOON = 'afternoon',
}

export enum WarningType {
    OVERTOTAL = 'overTotal',
    LATE_END = 'lateEnd',
    LATE_REQUEST = 'lateRequest',
}

export type Minutes = number;
export type Days = number;

export interface IMemberExtra {
    id: string; // user id
    offExtra: number; // Number to plus or minus to total dayoff
    wfhExtra: number; // Number to plus or minus to total wfh
    lateExtra: number; // Number to plus or minus to total late minutes
}

export interface IMemberOffRemain {
    off: number;
    wfh: number;
    late: number;
}

export interface IOffLog {
    id: string; // `${userId}_${msg_id}`
    user_id: string;
    msg_id: string;
    type: RequestType;
    createdDate: number; // milliseconds
    approved: boolean;
    startDate: number; // millis
    period: TimePeriod;
    duration: number;
    reason: string;
    warningList: IOffWarning[];
}

// form data
export interface IFormData {
    startDate: number;
    period: TimePeriod;
    duration: number;
    reason: string;
}

export interface IOffWarning {
    name: WarningType;
    tick: 'black' | 'red';
    value?: number;
}

export interface IOffMessageData {
    startDate: string;
    startDay: string;
    startDateDayLight: string;
    duration: number;
    endDate?: string;
    endDay?: string;
    endDateDayLight?: string;
}

export interface IScheduleData {
    date: string; // dd/mm/yyyy
    logs: IScheduleLog[];
}

export interface IScheduleLog {
    username: string;
    type: RequestType;
    period: TimePeriod;
    duration?: number;
}

export interface tickLogData {
    off: number;
    wfh: number;
    late: number;
    warning: IOffWarning[];
}

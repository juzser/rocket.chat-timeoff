export enum OffType {
    OFF = 'off',
    LATE = 'late',
    END_SOON = 'end',
    WFH = 'wfh',
}

export interface IOffLog {
    createdDate: number; // milliseconds
    type: OffType;
    startDate: number; // millis
    duration: number;
    reason: string;
}

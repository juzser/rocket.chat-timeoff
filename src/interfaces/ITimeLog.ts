export enum WfhStatus {
    START = 'start',
    PAUSE = 'pause',
    RESUME = 'resume',
    END = 'end',
}

export interface ITimeLog {
    id: string; // room_ddmmyyyy
    room: string; // room slugify name
    msgId: string; // message log id
    memberActive: Array<IMemberTime>; // user id array who active today
}

export interface IMemberTime {
    id: string; // user id
    username: string;
    offset: number; // timezone offset (+7)
    states: Array<IMemberState>;
}

export interface IMemberState {
    status: WfhStatus;
    timestamp: number;
    message: string;
}

export interface IMemberStatus {
    status: WfhStatus;
    message: string; // message id
}

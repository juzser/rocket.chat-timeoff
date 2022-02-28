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
    states: Array<IMemberState>;
}

export interface IMemberState {
    status: WfhStatus;
    timestamp: number;
    message: string;
}

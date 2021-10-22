import { ITimeLog } from '../interfaces/ITimeLog';

export class TimeLogCache {
    private _timelog: ITimeLog;
    private _expire: number;
    private _expirationTime: number = 30 * 60 * 1000; // 30 mins

    constructor(timelog: ITimeLog) {
        this._timelog = timelog;
        this._expire = Date.now() + this._expirationTime;
        return this;
    }

    public isValid(): boolean {
        return this._expire > Date.now();
    }

    get timelog(): ITimeLog {
        return this._timelog;
    }
}

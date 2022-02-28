import { ITimeLog } from '../interfaces/ITimeLog';

export class TimeLogCache {
    private _timelog: ITimeLog[];
    private _expire: number;
    private _expirationTime: number = 3 * 60 * 60 * 1000; // 3 hours

    constructor(timelog: ITimeLog) {
        if (!this._timelog) {
            this._timelog = [];
        }

        const timelogItem = this._timelog.findIndex((t) => t.id === timelog.id)
        if (timelogItem === -1) {
            this._timelog.push(timelog);
        } else {
            this._timelog[timelogItem] = timelog;
        }
        this._expire = Date.now() + this._expirationTime;
        return this;
    }

    public isValid(): boolean {
        return this._expire > Date.now();
    }

    public getTimelogById(id: string): ITimeLog | undefined {
        return this._timelog.find((t) => t.id === id);
    }

    get timelog(): ITimeLog[] {
        return this._timelog;
    }
}

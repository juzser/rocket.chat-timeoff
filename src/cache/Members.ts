export class MembersCache {
    private _members: Array<string>;
    private _expire: number;
    private _expirationTime: number = 900 * 1000; // 15 mins

    constructor(members: Array<string>) {
        this._members = members;
        this._expire = Date.now() + this._expirationTime;
        return this;
    }

    public isValid(): boolean {
        return this._expire > Date.now();
    }

    get members(): Array<string> {
        return this._members;
    }
}

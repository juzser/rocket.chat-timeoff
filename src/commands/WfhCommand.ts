import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as AppClass } from '../../TimeOffApp';

import { lang } from '../lang/index';
import { notifyUser } from '../lib/helpers';
import { CheckinResumeCommand, CheckinStartCommand, CheckoutCommand } from './Checkin';
import { HelpCommand } from './Help';
import { ExtractTimeLogCommand } from './ExtractTimeLog';

export class WfhCommand implements ISlashCommand {
    public command = 'wfh';
    public i18nParamsExample = 'wfh_params';
    public i18nDescription = 'wfh_desc';
    public providesPreview = false;

    private CommandEnum = {
        Help: 'help',
        Start: 'start',
        Pause: 'pause',
        Resume: 'resume',
        End: 'end',
        Extract: 'extract',
    };

    constructor(private readonly app: AppClass) {}

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [command, ...params] = context.getArguments();

        if (!command) {
            return await HelpCommand(this.app, context, read, modify);
        }

        const roomName = context.getRoom().slugifiedName;

        // Wrong room
        const checkinRooms = this.app.checkinRoom.split(',');
        if (!checkinRooms.includes(roomName)) {
            return await notifyUser({ app: this.app, message: lang.error.wrongRoom, user: context.getSender(), room: context.getRoom(), modify });
        }

        switch (command) {
            case this.CommandEnum.Help:
                await HelpCommand(this.app, context, read, modify);
                break;
            case this.CommandEnum.Start:
                await CheckinStartCommand(this.app, context, read, modify, persis, params);
                break;
            case this.CommandEnum.Resume:
                await CheckinResumeCommand(this.app, context, read, modify, persis, params);
                break;
            case this.CommandEnum.Pause:
                await CheckoutCommand('pause', this.app, context, read, modify, persis, params);
                break;
            case this.CommandEnum.End:
                await CheckoutCommand('end', this.app, context, read, modify, persis, params);
                break;
            case this.CommandEnum.Extract:
                await ExtractTimeLogCommand(this.app, context, read, modify, persis, params);
                break;

            default:
                await HelpCommand(this.app, context, read, modify);
        }
    }
}

import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as AppClass } from '../../TimeOffApp';
import { removeScheduleData } from '../lib/services';
import { ExtraOffCommand } from './ExtraOff';

import { HelpCommand } from './Help';
import { RequestCommand } from './Request';
import { TickBoardCommand } from './TickBoard';

export class OffCommand implements ISlashCommand {
    public command = 'off';
    public i18nParamsExample = 'off_params';
    public i18nDescription = 'off_desc';
    public providesPreview = false;

    private CommandEnum = {
        Help: 'help',
        Request: 'request',
        Extra: 'extra',
        Tick: 'tick',
    };

    constructor(private readonly app: AppClass) {}

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [command, ...params] = context.getArguments();

        switch (command) {
            case this.CommandEnum.Help:
                await HelpCommand(this.app, context, read, modify);
                break;
            case this.CommandEnum.Extra:
                await ExtraOffCommand({ app: this.app, context, read, persis, modify, params });
                break;
            case this.CommandEnum.Tick:
                await TickBoardCommand({ app: this.app, context, read, persis, modify, params });
                break;

            default:
                await RequestCommand({ app: this.app, context, read, persis, modify });
        }
    }
}

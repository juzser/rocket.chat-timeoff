import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as AppClass } from '../../TimeOffApp';
import { ExtraOffCommand } from './ExtraOff';

import { HelpCommand } from './Help';
import { StatsCommand } from './OffStats';
import { LogsCommand } from './OffLogs';
import { RequestCommand } from './Request';
import { TickBoardCommand } from './TickBoard';
import { MigrateCommand } from './MigrateData';

export class OffCommand implements ISlashCommand {
    public command = 'off';
    public i18nParamsExample = 'off_params';
    public i18nDescription = 'off_desc';
    public providesPreview = false;

    private CommandEnum = {
        Help: 'help',
        Request: 'request',
        Extra: 'extra', // /off extra admin wfh -1
        Tick: 'tick', // /off tick 31/01/2022
        Stats: 'stats', // /off stats 2022
        Logs: 'logs', // /off logs username
        // Migrate: 'migrate', // /off migrate
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
                await TickBoardCommand({ app: this.app, context, read, modify, params });
                break;
            case this.CommandEnum.Stats:
                await StatsCommand({ app: this.app, context, read, persis, modify, params });
                break;
            case this.CommandEnum.Logs:
                await LogsCommand({ app: this.app, context, read, persis, modify, params });
                break;
            // case this.CommandEnum.Migrate:
            //     await MigrateCommand({ app: this.app, context, read, persis, modify, params });
            //     break;

            default:
                await RequestCommand({ app: this.app, context, read, persis, modify });
        }
    }
}

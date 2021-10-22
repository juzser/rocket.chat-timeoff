import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as AppClass } from '../../TimeOffApp';

import { HelpCommand } from './Help';
import { RequestCommand } from './Request';

export class OffCommand implements ISlashCommand {
    public command = 'off';
    public i18nParamsExample = 'cmd_params';
    public i18nDescription = 'cmd_desc';
    public providesPreview = false;

    private CommandEnum = {
        Help: 'help',
        Request: 'request',
    };

    constructor(private readonly app: AppClass) {}

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [command, ...params] = context.getArguments();

        switch (command) {
            case this.CommandEnum.Help:
                await HelpCommand(this.app, context, read, modify);
                break;

            default:
                await RequestCommand(this.app, context, read, modify);
        }
    }
}

import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { notifyUser } from '../lib/helpers';

export async function HelpCommand(app: appClass, context: SlashCommandContext, read: IRead, modify: IModify): Promise<void> {
    const message = 'Use `/wfh start message(optional)`\nOption: start | pause | resume | end.';

    await notifyUser({ app, user: context.getSender(), room: context.getRoom(), message, modify });
}

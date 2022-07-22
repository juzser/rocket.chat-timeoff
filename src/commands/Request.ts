import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { RequestType } from '../interfaces/IRequestLog';
import { notifyUser } from '../lib/helpers';
import { requestModal } from '../modals/requestModal';

// Open modal to request time off
export async function RequestCommand({ app, context, read, persis, modify }: {
    app: appClass;
    context: SlashCommandContext;
    read: IRead;
    persis: IPersistence;
    modify: IModify
}): Promise<void> {
    const triggerId = context.getTriggerId();

    if (triggerId) {
        const modal = await requestModal({ app, user: context.getSender(), read, modify, persis, requestType: RequestType.OFF });

        await modify.getUiController().openModalView(modal, { triggerId }, context.getSender());
    }
}

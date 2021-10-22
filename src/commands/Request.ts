import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { notifyUser } from '../lib/helpers';
import { requestModal } from '../modals/requestModal';

export async function RequestCommand(app: appClass, context: SlashCommandContext, read: IRead, modify: IModify): Promise<void> {
    const triggerId = context.getTriggerId();

    if (triggerId) {
        const modal = await requestModal({ room: context.getRoom(), modify });

        await modify.getUiController().openModalView(modal, { triggerId }, context.getSender());
    }
}

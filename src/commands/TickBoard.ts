import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { ButtonStyle } from '@rocket.chat/apps-engine/definition/uikit';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { RequestType, tickLogData } from '../interfaces/IRequestLog';
import { notifyUser } from '../lib/helpers';
import { getOffLogByDate } from '../lib/services';
import { tickBoardModal } from '../modals/tickBoardModal';

// Open modal to request time off
export async function TickBoardCommand({ app, context, read, modify, params }: {
    app: appClass;
    context: SlashCommandContext;
    read: IRead;
    modify: IModify
    params: string[];
}): Promise<void> {
    const [ inputDate, ...rest ] = params;

    const logs = await getOffLogByDate(read, inputDate || '');

    if (!logs || !logs.length) {
        return await notifyUser({ app, user: context.getSender(), room: context.getRoom(), message: `No record found`, modify });
    }

    const messageData: Record<string, tickLogData> = {};
    logs.map((log) => {
        // create new log user
        if (!messageData[log.user_id]) {
            messageData[log.user_id] = {
                off: log.type === RequestType.OFF ? log.duration : 0,
                wfh: log.type === RequestType.WFH ? log.duration : 0,
                late: log.type === RequestType.LATE ? log.duration : 0,
                warning: log.warningList && log.warningList.length > 0 ? [ ...log.warningList ] : [],
            };
        } else {
            messageData[log.user_id].off += log.type === RequestType.OFF ? log.duration : 0;
            messageData[log.user_id].wfh += log.type === RequestType.WFH ? log.duration : 0;
            messageData[log.user_id].late += log.type === RequestType.LATE ? log.duration : 0;
            messageData[log.user_id].warning = log.warningList ? [ ...messageData[log.user_id].warning, ...log.warningList ] : messageData[log.user_id].warning;
        }
    });

    const triggerId = context.getTriggerId();

    if (triggerId) {
        const modal = await tickBoardModal({ app, read, modify, inputDate, messageData });

        await modify.getUiController().openModalView(modal, { triggerId }, context.getSender());
    }

    return;
}

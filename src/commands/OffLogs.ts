import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { notifyUser } from '../lib/helpers';
import { getOffLogsByUserId } from '../lib/services';
import { memberLogsModal } from '../modals/memberLogsModal';

// Open modal to request time off
export async function LogsCommand({ app, context, read, persis, modify, params }: {
    app: appClass;
    context: SlashCommandContext;
    read: IRead;
    persis: IPersistence;
    modify: IModify
    params: string[];
}): Promise<void> {
    // Not bot or leader
    if (context.getSender().username !== app.botUsername
        && !app.adminUsers?.includes(context.getSender().username)
    ) {
        return;
    }

    const [ username, ...rest ] = params;

    if (!username) {
        return;
    }

    const member = await read.getUserReader().getByUsername(username);

    const memberLogs = await getOffLogsByUserId(member.id, read);

    const yearMemberLogs = memberLogs.filter((log) => {
        const logDate = new Date(log.startDate);
        const today = new Date();

        return logDate.getFullYear() === today.getFullYear();
    });

    if (!yearMemberLogs || !yearMemberLogs.length) {
        return await notifyUser({ app, user: context.getSender(), room: context.getRoom(), message: `No record found`, modify });
    }

    const triggerId = context.getTriggerId();

    if (triggerId) {
        const modal = await memberLogsModal({ app, read, modify, persis, user: member, logsData: yearMemberLogs });

        await modify.getUiController().openModalView(modal, { triggerId }, context.getSender());
    }

    return;
}

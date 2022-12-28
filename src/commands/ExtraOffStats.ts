import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { getOffMemberByUser } from '../lib/services';
import { extraOffBoardModal } from '../modals/extraOffBoardModal';

// Open modal to request time off
export async function ExtraOffStatsCommand({ app, context, read, persis, modify, params }: {
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

    const members = app.offLogRoom ? await read.getRoomReader().getMembers(app.offLogRoom.id) : [];

    const activeMembers = members.filter((member) => {
        return member.isEnabled && member.type === 'user' && !member.roles.includes('guest');
    });

    const memberIds = activeMembers.sort(function(a, b) {
        const nameA = a.username.toUpperCase();
        const nameB = b.username.toUpperCase();
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        return 0;
    }).map((member) => member.id);

    // No member at all
    if (!memberIds || !memberIds.length) {
        return;
    }

    const membersExtra = await Promise.all(memberIds?.map(async (userId) => {
        const member = await read.getUserReader().getById(userId);

        const currentYear = new Date().getFullYear();
        const extra = await getOffMemberByUser(userId, currentYear, persis, read);

        return {
            username: member.username,
            offExtra: extra?.offExtra || 0,
            wfhExtra: extra?.wfhExtra || 0,
            lateExtra: extra?.lateExtra || 0,
        };
    }));

    const triggerId = context.getTriggerId();

    if (triggerId && membersExtra && membersExtra.length) {
        const modal = await extraOffBoardModal({ modify, stats: membersExtra });

        await modify.getUiController().openModalView(modal, { triggerId }, context.getSender());
    }

    return;
}

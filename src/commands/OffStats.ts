import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { getRemainingOff } from '../lib/services';
import { statsBoardModal } from '../modals/statsBoardModal';

// Open modal to request time off
export async function StatsCommand({ app, context, read, persis, modify, params }: {
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

    const room = await read.getRoomReader().getByName(app.offLogRoom);

    const members = room ? await read.getRoomReader().getMembers(room.id) : [];

    const activeMembers = members.filter((member) => {
        return member.isEnabled && member.type === 'user' && !member.roles.includes('guest');
    });

    const memberIds = activeMembers.map((member) => member.id);

    app.getLogger().info(room);
    app.getLogger().info(memberIds);

    // No member at all
    if (!memberIds || !memberIds.length) {
        return;
    }

    const [ year, ...rest ] = params;

    const membersRemaining = await Promise.all(memberIds?.map(async (userId) => {
        const user = await read.getUserReader().getById(userId);
        const remainingOff = await getRemainingOff({
            dayoffPerMonth: app.dayoffPerMonth,
            wfhPerMonth: app.totalWfhDays,
            limitLateDuration: app.limitLateDuration,
            userId,
            read,
            persis,
            year: +year || undefined,
        });

        return {
            username: user.username,
            remainingOff,
        };
    }));

    const triggerId = context.getTriggerId();

    if (triggerId) {
        const modal = await statsBoardModal({ modify, stats: membersRemaining, year: +year || undefined });

        await modify.getUiController().openModalView(modal, { triggerId }, context.getSender());
    }

    return;
}

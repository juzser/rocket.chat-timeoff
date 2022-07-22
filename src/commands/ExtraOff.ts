import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { RequestType } from '../interfaces/IRequestLog';
import { notifyUser } from '../lib/helpers';
import { createOffMember, getOffMemberByUser, updateOffMember } from '../lib/services';

// Open modal to request time off
export async function ExtraOffCommand({ app, context, read, persis, modify, params }: {
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

    if (!params || !params.length) {
        return;
    }

    const [ username, type, ...count ] = params;
    const user = await read.getUserReader().getByUsername(username);

    if (!user) {
        return await notifyUser({ app, user: context.getSender(), room: context.getRoom(), message: `User ${username} not found`, modify });
    }

    const userOffInfo = await getOffMemberByUser(user.id, persis, read);

    // Create new record if not exists or update existed one
    if (!userOffInfo) {
        await createOffMember(user.id, persis, {
            id: user.id,
            offExtra: type === RequestType.OFF ? parseInt(count[0], 10) : 0,
            wfhExtra: type === RequestType.WFH ? parseInt(count[0], 10) : 0,
            lateExtra: type === RequestType.LATE || type === RequestType.END_SOON ? parseInt(count[0], 10) : 0,
        });
    } else {
        await updateOffMember(user.id, persis, {
            id: user.id,
            offExtra: type === RequestType.OFF
                ? parseInt(count[0], 10) + userOffInfo.offExtra
                : userOffInfo.offExtra,
            wfhExtra: type === RequestType.WFH
                ? parseInt(count[0], 10) + userOffInfo.wfhExtra
                : userOffInfo.wfhExtra,
            lateExtra: type === RequestType.LATE || type === RequestType.END_SOON
                ? parseInt(count[0], 10) + userOffInfo.lateExtra
                : userOffInfo.lateExtra,
        });
    }

    return await notifyUser({ app, user: context.getSender(), room: context.getRoom(), message: 'Updated!', modify })
}

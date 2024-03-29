import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { RequestType } from '../interfaces/IRequestLog';
import { notifyUser } from '../lib/helpers';
import { getOffMemberByUser, updateOffMember } from '../lib/services';

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

    const [ username, type, count, ...year ] = params;
    const user = await read.getUserReader().getByUsername(username);

    if (!user) {
        return await notifyUser({ app, user: context.getSender(), room: context.getRoom(), message: `User ${username} not found`, modify });
    }

    if (!type) {
        return await notifyUser({ app, user: context.getSender(), room: context.getRoom(), message: `Missing type: wfh or off. Example: /off extra admin wfh -1`, modify });
    }

    if (!count) {
        return await notifyUser({ app, user: context.getSender(), room: context.getRoom(), message: `Missing total extra. Example: /off extra admin wfh -1`, modify });
    }

    const countYear = year.length ? +year[0] : new Date().getFullYear();

    const userOffInfo = await getOffMemberByUser(user.id, countYear, persis, read);

    // Create new record if not exists or update existed one
    const offExtraData = {
        id: user.id,
        offExtra: userOffInfo?.offExtra || 0,
        wfhExtra: userOffInfo?.wfhExtra || 0,
        lateExtra: userOffInfo?.lateExtra || 0,
    };

    if (type === RequestType.OFF) {
        offExtraData.offExtra = +count + (userOffInfo?.offExtra || 0);
    }

    if (type === RequestType.WFH) {
        offExtraData.wfhExtra = +count + (userOffInfo?.wfhExtra || 0);
    }

    if (type === RequestType.LATE || type === RequestType.END_SOON) {
        offExtraData.lateExtra = +count + (userOffInfo?.lateExtra || 0);
    }

    await updateOffMember(user.id, countYear, persis, offExtraData);

    return await notifyUser({ app, user: context.getSender(), room: context.getRoom(), message: 'Updated!', modify })
}

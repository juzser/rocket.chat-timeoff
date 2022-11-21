import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { notifyUser } from '../lib/helpers';
import { createOffLog, getOffLogs } from '../lib/services';

// Open modal to request time off
export async function MigrateCommand({ app, context, read, persis, modify, params }: {
    app: appClass;
    context: SlashCommandContext;
    read: IRead;
    persis: IPersistence;
    modify: IModify
    params: string[];
}): Promise<void> {
    const allOffs = await getOffLogs(read);

    try {
        // Remove all old data
        const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'timeoff-log');

        await persis.removeByAssociation(association);

        // Migrate data
        await Promise.all(
            allOffs.map(async (off) => {
                console.log('off', off);

                if (!off.id) {
                    return 'failed';
                }

                await createOffLog(persis, off);
                await notifyUser({
                    app,
                    modify,
                    message: `done migrating ${off.startDate} - ${off.reason}`,
                    user: context.getSender(),
                    room: context.getRoom(),
                });
                return 'done';
            }),
        );
    } catch (e) {
        console.log(e);
    }
}

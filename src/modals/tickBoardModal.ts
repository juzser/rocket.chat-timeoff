import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';
import { IOffWarning, tickLogData } from '../interfaces/IRequestLog';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { lang } from '../lang/index';

export async function tickBoardModal({ app, read, modify, inputDate, messageData }: {
    app: appClass;
    read: IRead;
    modify: IModify;
    inputDate: string;
    messageData: Record<string, tickLogData>;
}): Promise<IUIKitModalViewParam> {
    const block = modify.getCreator().getBlockBuilder();

    block.addSectionBlock({
        text: block.newMarkdownTextObject(lang.tickBoard.boardName(inputDate || '')),
    });

    let messageContent = '';
    await Promise.all(Object.keys(messageData).map(async (userId, index) => {
        const user = await read.getUserReader().getById(userId);

        if (user.isEnabled && user.type === 'user' && !user.roles.includes('guest')) {
            const off = messageData[userId].off;
            const wfh = messageData[userId].wfh;
            const late = messageData[userId].late;
            const warning = messageData[userId].warning as IOffWarning[];

            messageContent += `${index ? '\n': ''}${lang.tickBoard.userLine({ username: user.username, off, wfh, late })} `;

            warning.forEach((w) => {
                messageContent += `${w.tick === 'red' ? ':x:' : ':heavy_multiplication_x:'}`;
            })
        }
    }));

    block.addContextBlock({
        elements: [
            block.newMarkdownTextObject(messageContent),
        ],
    });

    return {
        id: 'modalTickBoard',
        title: block.newPlainTextObject(lang.tickBoard.heading),
        close: block.newButtonElement({
            text: block.newPlainTextObject(lang.common.cancel),
        }),
        blocks: block.getBlocks(),
    };
}

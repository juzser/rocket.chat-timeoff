import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';

import { lang } from '../lang/index';

export async function extraOffBoardModal({ modify, stats }: {
    modify: IModify;
    stats: {
        username: string;
        offExtra?: number;
        wfhExtra?: number;
        lateExtra?: number;
    }[];
}): Promise<IUIKitModalViewParam> {
    const block = modify.getCreator().getBlockBuilder();

    let messageContent = '';

    stats.map((stat, index) => {
        messageContent += `${index ? '\n': ''}${index + 1}. ${lang.extraLogs.userLine({ username: stat.username, off: stat.offExtra, wfh: stat.wfhExtra, late: stat.lateExtra })}`;
    });

    block.addSectionBlock({
        text: block.newMarkdownTextObject(messageContent),
    });

    return {
        id: 'modalExtraOffBoard',
        title: block.newPlainTextObject(lang.extraLogs.heading),
        close: block.newButtonElement({
            text: block.newPlainTextObject(lang.common.cancel),
        }),
        blocks: block.getBlocks(),
    };
}

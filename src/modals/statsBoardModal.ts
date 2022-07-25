import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';
import { IMemberOffRemain, IOffWarning } from '../interfaces/IRequestLog';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { lang } from '../lang/index';

export async function statsBoardModal({ modify, stats, year }: {
    modify: IModify;
    stats: {
        username: string;
        remainingOff: IMemberOffRemain;
    }[];
    year?: number;
}): Promise<IUIKitModalViewParam> {
    const block = modify.getCreator().getBlockBuilder();

    block.addSectionBlock({
        text: block.newMarkdownTextObject(lang.statsBoard.caption(year)),
    });

    let messageContent = '';

    stats.map((stat, index) => {
        messageContent += `${index ? '\n': ''}${index + 1}. ${lang.statsBoard.userLine({ username: stat.username, off: stat.remainingOff.off, wfh: stat.remainingOff.wfh })} `;
    });

    block.addSectionBlock({
        text: block.newMarkdownTextObject(messageContent),
    });

    return {
        id: 'modalTickBoard',
        title: block.newPlainTextObject(lang.statsBoard.heading),
        close: block.newButtonElement({
            text: block.newPlainTextObject(lang.common.cancel),
        }),
        blocks: block.getBlocks(),
    };
}

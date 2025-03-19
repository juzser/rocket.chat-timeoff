import { IUIKitSurfaceViewParam } from '@rocket.chat/apps-engine/definition/accessors';
import { UIKitSurfaceType } from '@rocket.chat/apps-engine/definition/uikit';

import { LayoutBlock } from '@rocket.chat/ui-kit';
import { lang } from '../lang/index';
import { TimeOffApp as appClass } from '../../TimeOffApp';

export async function extraOffBoardModal({ app, stats }: {
    app: appClass;
    stats: {
        username: string;
        offExtra?: number;
        wfhExtra?: number;
        lateExtra?: number;
    }[];
}): Promise<IUIKitSurfaceViewParam> {
    const block: LayoutBlock[] = [];

    let messageContent = '';

    stats.map((stat, index) => {
        messageContent += `${index ? '\n': ''}${index + 1}. ${lang.extraLogs.userLine({ username: stat.username, off: stat.offExtra, wfh: stat.wfhExtra, late: stat.lateExtra })}`;
    });

    block.push({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: messageContent,
        },
    });

    return {
        type: UIKitSurfaceType.MODAL,
        id: 'modalExtraOffBoard',
        title: {
            type: 'plain_text',
            text: lang.extraLogs.heading,
        },
        close: {
            appId: app.getID(),
            blockId: 'extraOffBoardModal',
            actionId: 'close',
            type: 'button',
            text: {
                type: 'plain_text',
                text: lang.common.cancel,
            },
        },
        blocks: block,
    };
}

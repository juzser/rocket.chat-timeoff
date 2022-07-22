import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { ButtonStyle } from '@rocket.chat/apps-engine/definition/uikit';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { RequestType, TimePeriod } from '../interfaces/IRequestLog';
import { lang } from '../lang/index';
import { offBlockBuilder } from '../forms/blocksOff';
import { wfhBlockBuilder } from '../forms/blocksWfh';
import { endSoonBlockBuilder } from '../forms/blocksEndSoon';
import { lateBlockBuilder } from '../forms/blocksLate';
import { getRemainingOff } from '../lib/services';

export async function requestModal({ app, user, modify, read, persis, requestType = '' }: {
    app: appClass,
    user: IUser,
    modify: IModify,
    read: IRead,
    persis: IPersistence,
    requestType?: string,
}): Promise<IUIKitModalViewParam> {
    const block = modify.getCreator().getBlockBuilder();

    const offRemaining = await getRemainingOff({
        dayoffPerMonth: app.dayoffPerMonth,
        wfhPerMonth: app.totalWfhDays,
        limitLateDuration: app.limitLateDuration,
        userId: user.id,
        read,
        persis,
    });

    block.addSectionBlock({
        text: block.newMarkdownTextObject(lang.requestModal.caption(offRemaining.off, offRemaining.wfh)),
    });

    // Off type options
    const typeOptions = [
        {
            text: block.newPlainTextObject(lang.type.off),
            value: RequestType.OFF,
        },
        {
            text: block.newPlainTextObject(lang.type.wfh),
            value: RequestType.WFH,
        },
        {
            text: block.newPlainTextObject(lang.type.late),
            value: RequestType.LATE,
        },
        {
            text: block.newPlainTextObject(lang.type.endSoon),
            value: RequestType.END_SOON,
        },
    ];

    // Add Fields
    block
        .addActionsBlock({
            blockId: 'requestOff',
            elements: [
                block.newStaticSelectElement({
                    actionId: 'offType',
                    initialValue: requestType || RequestType.OFF,
                    options: typeOptions,
                    placeholder: block.newPlainTextObject(lang.requestModal.fields.type),
                }
            )
        ],
        })
        .addDividerBlock();

    if (requestType === RequestType.LATE) {
        // Late request
        lateBlockBuilder(block);
    }

    else if (requestType === RequestType.END_SOON) {
        // End soon request
        endSoonBlockBuilder(block);
    }

    else if (requestType === RequestType.OFF) {
        // Off request
        offBlockBuilder(block);
    }

    else if (requestType === RequestType.WFH) {
        // WFH request
        wfhBlockBuilder(block);
    }

    return {
        id: 'modalRequestOff',
        title: block.newPlainTextObject(lang.requestModal.heading),
        submit: block.newButtonElement({
            text: block.newPlainTextObject(lang.common.confirm),
            style: ButtonStyle.DANGER,
        }),
        close: block.newButtonElement({
            text: block.newPlainTextObject(lang.common.cancel),
        }),
        blocks: block.getBlocks(),
    };
}

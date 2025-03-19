import { IModify, IPersistence, IRead, IUIKitSurfaceViewParam } from '@rocket.chat/apps-engine/definition/accessors';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { ButtonStyle, UIKitSurfaceType } from '@rocket.chat/apps-engine/definition/uikit';
import { LayoutBlock, type Option } from '@rocket.chat/ui-kit';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { RequestType } from '../interfaces/IRequestLog';
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
}): Promise<IUIKitSurfaceViewParam> {
    const block: LayoutBlock[] = [];

    const offRemaining = await getRemainingOff({
        dayoffPerMonth: app.dayoffPerMonth,
        wfhPerMonth: app.totalWfhDays,
        limitLateDuration: app.limitLateDuration,
        userId: user.id,
        read,
        persis,
    });

    block.push({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: lang.requestModal.caption(offRemaining.off, offRemaining.wfh),
        },
    });

    // Off type options
    const typeOptions: Option[] = [
        {
            text: {
                type: 'plain_text',
                text: lang.type.off,
            },
            value: RequestType.OFF,
        },
        {
            text: {
                type: 'plain_text',
                text: lang.type.wfh,
            },
            value: RequestType.WFH,
        },
        {
            text: {
                type: 'plain_text',
                text: lang.type.late,
            },
            value: RequestType.LATE,
        },
        {
            text: {
                type: 'plain_text',
                text: lang.type.endSoon,
            },
            value: RequestType.END_SOON,
        },
    ];

    // Add Fields
    block.push({
        type: 'actions',
        blockId: 'requestOff',
        elements: [{
            type: 'static_select',
            appId: app.getID(),
            blockId: 'requestOff',
            actionId: 'offType',
            initialValue: requestType || RequestType.OFF,
            placeholder: {
                type: 'plain_text',
                text: lang.requestModal.fields.type,
            },
            options: typeOptions,
        }],
    });

    block.push({
        type: 'divider',
    });

    if (requestType === RequestType.LATE) {
        // Late request
        block.push(...lateBlockBuilder(app));
    }

    else if (requestType === RequestType.END_SOON) {
        // End soon request
        block.push(...endSoonBlockBuilder(app));
    }

    else if (requestType === RequestType.OFF) {
        // Off request
        block.push(...offBlockBuilder(app));
    }

    else if (requestType === RequestType.WFH) {
        // WFH request
        block.push(...wfhBlockBuilder(app));
    }

    return {
        type: UIKitSurfaceType.MODAL,
        id: 'modalRequestOff',
        title: {
            type: 'plain_text',
            text: lang.requestModal.heading,
        },
        submit: {
            appId: app.getID(),
            blockId: 'requestOffModal',
            actionId: 'requestOffSubmit',
            type: 'button',
            text: {
                type: 'plain_text',
                text: lang.common.confirm,
            },
            style: ButtonStyle.DANGER,
        },
        close: {
            type: 'button',
            appId: app.getID(),
            blockId: 'requestOffModal',
            actionId: 'requestOffCancel',
            text: {
                type: 'plain_text',
                text: lang.common.cancel,
            },
        },
        blocks: block,
    };
}

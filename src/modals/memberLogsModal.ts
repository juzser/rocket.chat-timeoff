import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';
import { IMemberOffRemain, IOffLog, IOffWarning, RequestType } from '../interfaces/IRequestLog';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { lang } from '../lang/index';
import { getRemainingOff } from '../lib/services';
import { buildOffMessageData } from '../lib/helpers';

export async function memberLogsModal({ app, read, modify, persis, user, logsData }: {
    app: appClass;
    read: IRead;
    modify: IModify;
    persis: IPersistence;
    user: IUser;
    logsData: IOffLog[];
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
        text: block.newMarkdownTextObject(lang.memberLogs.caption(user.username, offRemaining.off, offRemaining.wfh)),
    });

    let messageContent = '';

    logsData.forEach((log, index) => {
        const { startDate, period, type, duration } = log;
        const msgData = buildOffMessageData({
            startDate,
            period,
            type,
            duration,
        });

        if (type === RequestType.OFF || type === RequestType.WFH) {
            const content = lang.confirmRequestModal.offOverview({
                user: user.username,
                type,
                ...msgData,
                endDate: msgData.endDate ? msgData.endDate : '',
                endDay: msgData.endDay ? msgData.endDay : '',
                endDateDayLight: msgData.endDateDayLight ? msgData.endDateDayLight : '',
            })

            messageContent += `${index + 1}. ${content}`;
        } else {
            const content = lang.confirmRequestModal.lateOverview({
                user: user.username,
                type,
                ...msgData,
            })

            messageContent += `${index + 1}. ${content}`;
        }

        messageContent += `\n${lang.offLogMessage.reason} ${log.reason}`;

        if (log.warningList && log.warningList.length > 0) {
            log.warningList.forEach((warning: IOffWarning) => {
                messageContent += ` ${warning.tick === 'red' ? ':x:' : ':heavy_multiplication_x:'}`;
            });
        }

        messageContent += '\n\n';
    });

    block.addContextBlock({
        elements: [
            block.newMarkdownTextObject(messageContent),
        ],
    });

    return {
        id: 'modalMemberLogs',
        title: block.newPlainTextObject(lang.memberLogs.heading),
        close: block.newButtonElement({
            text: block.newPlainTextObject(lang.common.cancel),
        }),
        blocks: block.getBlocks(),
    };
}

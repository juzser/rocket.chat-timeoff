import { IOffMessageData, IOffWarning, RequestType, WarningType, IFormData } from '../interfaces/IRequestLog';
import { LayoutBlock } from '@rocket.chat/ui-kit';
import { lang } from '../lang/index';

export async function offlogBlock({ appId, username, type, msgData, formData, warningList, isCancelled }: {
    appId: string;
    username: string;
    type: RequestType;
    msgData: IOffMessageData;
    formData: IFormData;
    warningList: IOffWarning[];
    isCancelled?: boolean;
}): Promise<LayoutBlock[]> {
    const block: Array<LayoutBlock> = [];

    let caption = lang.offLogMessage.icon[type];

    if (type === RequestType.OFF || type === RequestType.WFH) {
        caption += ` ${lang.confirmRequestModal.offOverview({
            type,
            user: username,
            ...msgData,
        } as any)}`;
    } else {
        caption += ` ${lang.confirmRequestModal.lateOverview({
            type,
            user: username,
            ...msgData,
        } as any)}`;
    }

    block.push({
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: caption,
        },
        ...!isCancelled && {
            accessory: {
                type: 'overflow',
                actionId: 'logActions',
                options: [
                    {
                        text: {
                            type: 'plain_text',
                            text: lang.common.undo,
                        },
                        value: 'undo',
                    },
                ],
                appId,
                blockId: 'undoLog-block',
            }
        },
    });

    if (!isCancelled) {
        // Sub information
        let description = `${lang.offLogMessage.reason} ${formData.reason}`;

        if (warningList && warningList.length > 0) {
            description += '\n';
            warningList.forEach((warning) => {
                description += `\n${warning.tick === 'red' ? ':x:' : ':heavy_multiplication_x:'}`;

                if (warning.name === WarningType.OVERTOTAL) {
                    description += ` ${lang.offLogMessage.warningOverTotal(warning.value)}`;
                }

                if (warning.name === WarningType.LATE_END) {
                    description += ` ${lang.offLogMessage.warningLateTick}`;
                }

                if (warning.name === WarningType.LATE_REQUEST) {
                    description += ` ${lang.offLogMessage.warningLateRequest}`;
                }
            });
        }

        block.push({
           type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: description,
                },
            ],
        });
    } else { // show cancelled message
        block.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: lang.offLogMessage.requestCancelled(username),
                },
            ],
        });
    }

    return block;
}

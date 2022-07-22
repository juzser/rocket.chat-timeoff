import { BlockBuilder } from '@rocket.chat/apps-engine/definition/uikit';
import { IOffMessageData, IOffWarning, RequestType, WarningType, IFormData } from '../interfaces/IRequestLog';
import { lang } from '../lang/index';

export async function offlogBlock({ username, type, block, msgData, formData, warningList }: {
    username: string;
    block: BlockBuilder;
    type: RequestType;
    msgData: IOffMessageData;
    formData: IFormData;
    warningList: IOffWarning[];
}): Promise<void> {
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

    block.addSectionBlock({
        text: block.newMarkdownTextObject(caption),
    });

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

    block.addContextBlock({
        elements: [
            block.newMarkdownTextObject(description),
        ],
    });
}

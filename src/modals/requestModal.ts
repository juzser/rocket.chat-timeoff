import { IModify } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { ButtonStyle } from '@rocket.chat/apps-engine/definition/uikit';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';

import { OffType } from '../interfaces/IOffLog';
import { lang } from '../lang/index';

export async function requestModal({ modify, room, requestType }: {
    modify: IModify,
    room: IRoom,
    requestType?: string,
}): Promise<IUIKitModalViewParam> {
    const block = modify.getCreator().getBlockBuilder();

    block.addSectionBlock({
        text: block.newMarkdownTextObject(lang.requestModal.caption(1)),
    });

    // Off type options
    const typeOptions = [
        {
            text: block.newPlainTextObject(lang.type.wfh),
            value: OffType.WFH,
        },
        {
            text: block.newPlainTextObject(lang.type.late),
            value: OffType.LATE,
        },
        {
            text: block.newPlainTextObject(lang.type.endSoon),
            value: OffType.END_SOON,
        },
        {
            text: block.newPlainTextObject(lang.type.off),
            value: OffType.OFF,
        },
    ];

    const initType = requestType ? requestType : OffType.WFH;

    // Add Fields
    block
        .addActionsBlock({
            blockId: 'requestOff',
            elements: [
                block.newStaticSelectElement({
                    actionId: 'offType',
                    initialValue: initType,
                    options: typeOptions,
                    placeholder: block.newPlainTextObject(lang.requestModal.fields.type),
                }),
            ],
        })
        .addDividerBlock();

    return {
        id: 'requestOff',
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

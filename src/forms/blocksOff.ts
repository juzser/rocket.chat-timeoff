import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { BlockBuilder } from "@rocket.chat/apps-engine/definition/uikit/blocks";
import { RequestType, TimePeriod } from "../interfaces/IRequestLog";
import { lang } from "../lang/index";
import { convertTimestampToDate } from "../lib/helpers";


export function offBlockBuilder(block: BlockBuilder) {
    const date = new Date();
    let tomorrow = date.setDate(date.getDate() + 1);
    if (date.getDay() === 0) {
        tomorrow = date.setDate(date.getDate() + 1);
    }
    if (date.getDay() === 6) {
        tomorrow = date.setDate(date.getDate() + 2);
    }
    const tomorrowFormated = convertTimestampToDate(tomorrow);

    // Add Fields
    block
        .addInputBlock({
            blockId: 'inputData',
            label: block.newPlainTextObject(lang.requestModal.fields.startDate(RequestType.OFF)),
            element: block.newPlainTextInputElement({
                placeholder: block.newPlainTextObject('dd/mm/yyyy'),
                initialValue: tomorrowFormated,
                actionId: 'offStartDate',
            }),
        })
        .addInputBlock({
            blockId: 'inputData',
            label: block.newPlainTextObject(lang.requestModal.fields.period(RequestType.OFF)),
            element: block.newStaticSelectElement({
                placeholder: block.newPlainTextObject(lang.requestModal.fields.period(RequestType.OFF)),
                actionId: 'offPeriod',
                initialValue: TimePeriod.DAY,
                options: [
                    {
                        text: block.newPlainTextObject(lang.requestModal.period.day),
                        value: TimePeriod.DAY,
                    },
                    {
                        text: block.newPlainTextObject(lang.requestModal.period.morning),
                        value: TimePeriod.MORNING,
                    },
                    {
                        text: block.newPlainTextObject(lang.requestModal.period.afternoon),
                        value: TimePeriod.AFTERNOON,
                    },
                ],
            }),
        })
        .addInputBlock({
            blockId: 'inputData',
            label: block.newPlainTextObject(lang.requestModal.fields.duration(RequestType.OFF)),
            element: block.newPlainTextInputElement({
                placeholder: block.newPlainTextObject('0.5, 1, ...'),
                initialValue: '1',
                actionId: 'offDuration',
            }),
        })
        .addInputBlock({
            blockId: 'inputData',
            label: block.newPlainTextObject(lang.requestModal.fields.reason),
            element: block.newPlainTextInputElement({
                actionId: 'offReason',
                multiline: true,
            }),
        });
}

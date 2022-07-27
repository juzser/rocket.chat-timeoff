import { IRoom } from "@rocket.chat/apps-engine/definition/rooms";
import { BlockBuilder } from "@rocket.chat/apps-engine/definition/uikit/blocks";
import { RequestType, TimePeriod } from "../interfaces/IRequestLog";
import { lang } from "../lang/index";
import { convertTimestampToDate } from "../lib/helpers";


export function endSoonBlockBuilder(block: BlockBuilder) {
    const date = new Date();
    let nextWeekDayCount = 1;
    if (date.getDay() === 5) {
        nextWeekDayCount = 3;
    }
    if (date.getDay() === 6) {
        nextWeekDayCount = 2;
    }
    const tomorrow = date.setDate(date.getDate() + nextWeekDayCount);
    const tomorrowFormated = convertTimestampToDate(tomorrow);

    // Add Fields
    block
        .addInputBlock({
            blockId: 'inputData',
            label: block.newPlainTextObject(lang.requestModal.fields.startDate(RequestType.END_SOON)),
            element: block.newPlainTextInputElement({
                placeholder: block.newPlainTextObject('dd/mm/yyyy'),
                initialValue: tomorrowFormated,
                actionId: 'endSoonStartDate',
            }),
        })
        .addInputBlock({
            blockId: 'inputData',
            label: block.newPlainTextObject(lang.requestModal.fields.period(RequestType.END_SOON)),
            element: block.newStaticSelectElement({
                placeholder: block.newPlainTextObject(lang.requestModal.fields.period(RequestType.END_SOON)),
                actionId: 'endSoonPeriod',
                initialValue: TimePeriod.AFTERNOON,
                options: [
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
            label: block.newPlainTextObject(lang.requestModal.fields.duration(RequestType.END_SOON)),
            element: block.newPlainTextInputElement({
                placeholder: block.newPlainTextObject('30, 45, 60,...'),
                initialValue: '30',
                actionId: 'endSoonDuration',
            }),
        })
        .addInputBlock({
            blockId: 'inputData',
            label: block.newPlainTextObject(lang.requestModal.fields.reason),
            element: block.newPlainTextInputElement({
                actionId: 'endSoonReason',
                multiline: true,
            }),
        });
}

import { LayoutBlock } from "@rocket.chat/ui-kit";
import { RequestType, TimePeriod } from "../interfaces/IRequestLog";
import { lang } from "../lang/index";
import { convertTimestampToDate } from "../lib/helpers";
import { TimeOffApp as appClass } from '../../TimeOffApp';


export function lateBlockBuilder(app: appClass): LayoutBlock[] {
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
    return [{
        type: 'input',
        blockId: 'inputDataBlock',
        label: {
            type: 'plain_text',
            text: lang.requestModal.fields.startDate(RequestType.LATE),
        },
        element: {
            appId: app.getID(),
            blockId: 'inputData',
            type: 'plain_text_input',
            placeholder: {
                type: 'plain_text',
                text: 'dd/mm/yyyy',
            },
            initialValue: tomorrowFormated,
            actionId: 'lateStartDate',
        },
    }, {
        type: 'input',
        blockId: 'inputDataBlock',
        label: {
            type: 'plain_text',
            text: lang.requestModal.fields.period(RequestType.LATE),
        },
        element: {
            appId: app.getID(),
            blockId: 'inputData',
            type: 'static_select',
            initialValue: TimePeriod.MORNING,
            actionId: 'latePeriod',
            placeholder: {
                type: 'plain_text',
                text: lang.requestModal.fields.period(RequestType.LATE),
            },
            options: [
                {
                    text: {
                        type: 'plain_text',
                        text: lang.requestModal.period.morning,
                    },
                    value: TimePeriod.MORNING,
                },
                {
                    text: {
                        type: 'plain_text',
                        text: lang.requestModal.period.afternoon,
                    },
                    value: TimePeriod.AFTERNOON,
                },
            ],
        },
    }, {
        type: 'input',
        blockId: 'inputDataBlock',
        label: {
            type: 'plain_text',
            text: lang.requestModal.fields.duration(RequestType.LATE),
        },
        element: {
            appId: app.getID(),
            blockId: 'inputData',
            type: 'plain_text_input',
            placeholder: {
                type: 'plain_text',
                text: '30, 45, 60,...',
            },
            initialValue: '30',
            actionId: 'lateDuration',
        },
    }, {
        type: 'input',
        blockId: 'inputDataBlock',
        label: {
            type: 'plain_text',
            text: lang.requestModal.fields.reason,
        },
        element: {
            appId: app.getID(),
            blockId: 'inputData',
            type: 'plain_text_input',
            actionId: 'lateReason',
            multiline: true,
        },
    }];
}

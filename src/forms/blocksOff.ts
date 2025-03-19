import { LayoutBlock } from "@rocket.chat/ui-kit";
import { RequestType, TimePeriod } from "../interfaces/IRequestLog";
import { lang } from "../lang/index";
import { convertTimestampToDate } from "../lib/helpers";
import { TimeOffApp as appClass } from '../../TimeOffApp';


export function offBlockBuilder(app: appClass): LayoutBlock[] {
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
            text: lang.requestModal.fields.startDate(RequestType.OFF),
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
            actionId: 'offStartDate',
        },
    }, {
        type: 'input',
        blockId: 'inputDataBlock',
        label: {
            type: 'plain_text',
            text: lang.requestModal.fields.period(RequestType.OFF),
        },
        element: {
            appId: app.getID(),
            blockId: 'inputData',
            type: 'static_select',
            initialValue: TimePeriod.DAY,
            actionId: 'offPeriod',
            placeholder: {
                type: 'plain_text',
                text: lang.requestModal.fields.period(RequestType.OFF),
            },
            options: [
                {
                    text: {
                        type: 'plain_text',
                        text: lang.requestModal.period.day,
                    },
                    value: TimePeriod.DAY,
                },
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
            text: lang.requestModal.fields.duration(RequestType.OFF),
        },
        element: {
            appId: app.getID(),
            blockId: 'inputData',
            type: 'plain_text_input',
            placeholder: {
                type: 'plain_text',
                text: '0.5, 1, ...',
            },
            initialValue: '1',
            actionId: 'offDuration',
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
            actionId: 'offReason',
            multiline: true,
        },
    }];
}

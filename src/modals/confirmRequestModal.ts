import { IModify } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { ButtonStyle } from '@rocket.chat/apps-engine/definition/uikit';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';

import { IOffMessageData, IOffWarning, RequestType, TimePeriod, WarningType, IFormData, IMemberOffRemain } from '../interfaces/IRequestLog';
import { lang } from '../lang/index';
import { convertTimestampToDate, getTotalHours } from '../lib/helpers';
import { AppConfig } from '../lib/config';

export async function confirmRequestModal({ type, modify, formData, remaining, checkinTime, checkoutTime, requestOffBefore, requestWfhBefore, requestLateBefore, limitLateDuration }: {
    type: RequestType,
    modify: IModify,
    formData: IFormData,
    remaining: IMemberOffRemain,
    checkinTime: { morning: string; afternoon: string },
    checkoutTime: { morning: string; afternoon: string },
    requestOffBefore: number;
    requestWfhBefore: number;
    requestLateBefore: number;
    limitLateDuration: number;
}): Promise<IUIKitModalViewParam> {
    const block = modify.getCreator().getBlockBuilder();

    const { startDate, period, duration } = formData;

    const startDateFormatted = convertTimestampToDate(startDate);
    const startDayName = lang.day[new Date(startDate).getDay()];

    const warningList: IOffWarning[] = [];
    let msgData: IOffMessageData | undefined;

    if (type === RequestType.OFF || type === RequestType.WFH) {
        // If the duration is 1 day and start in the morning,
        // so the daylight should be whole day
        const startDateDayLight = (period === TimePeriod.MORNING && duration > 0.5)
            ? TimePeriod.DAY
            : period;

        // if the type is off or wfh, so it should be milliseconds count by day.
        // If duration is large than 1 day & in the morning, so it should be counted until 11:59:59;
        // Unless, it's the next day.
        let durationMilliseconds = duration * 24 * 60 * 60 * 1000 - (
            duration > 1 && startDateDayLight !== TimePeriod.AFTERNOON ? 1000 : 0
        );

        // Ignore weekends
        // If the off day passes throught the weekend, so the duration should be increase 2 days multiple with number of week it passed.
        const startDateParsed = new Date(startDate);
        const startDateDay = startDateParsed.getDay();

        if ((startDateDay + duration) > 6) {
            const weekendTimes = Math.floor((startDateDay + duration) / 5);
            durationMilliseconds += weekendTimes * 2 * 24 * 60 * 60 * 1000;
        }

        // Daylight:
        // Integer (1, 2, 3, ...) means: start from afternoon - end by the end of morning
        //                        start from morning/day - end by the end of the day
        // Float (1.5, 2.5, ...) means: start from afternoon - end by the end of the day
        //                        start from morning/day - end by the end of the morning
        let endDate, endDateDayLight;
        if (duration > 1 || (duration === 1 && period === TimePeriod.AFTERNOON)) {
            endDate = convertTimestampToDate(startDate + durationMilliseconds);
            endDateDayLight = duration % 1 === 0
                ? (startDateDayLight === TimePeriod.AFTERNOON
                    ? TimePeriod.MORNING
                    : TimePeriod.DAY)
                : (startDateDayLight === TimePeriod.AFTERNOON
                    ? TimePeriod.DAY
                    : TimePeriod.MORNING);
        }

        // Store the data for the message
        msgData = {
            startDate: startDateFormatted,
            startDay: startDayName,
            startDateDayLight,
            duration,
            endDate,
            endDay: lang.day[new Date(startDate + durationMilliseconds).getDay()],
            endDateDayLight,
        };

        // Confirm information
        block.addSectionBlock({
            text: block.newMarkdownTextObject(lang.confirmRequestModal.offOverview({
                user: null,
                type,
                ...msgData,
            } as any)),
        });


        // Total remaining day off
        const totalLeft = (type === RequestType.OFF ? remaining.off : remaining.wfh) - duration;

        block.addSectionBlock({
            text: block.newMarkdownTextObject(lang.confirmRequestModal.remainingNotice(
                type,
                totalLeft,
            )),
        });

        // Warning if request over number of day off
        if (totalLeft < 0) {
            block.addDividerBlock();
            block.addSectionBlock({
                text: block.newMarkdownTextObject(lang.confirmRequestModal.warningOverTotal(type)),
            });

            // Store the warning state
            warningList.push({ name: WarningType.OVERTOTAL, value: totalLeft, tick: 'red' });
        }
    } else { // Late or End Soon
        // Confirm information
        msgData = {
            startDate: startDateFormatted,
            startDay: startDayName,
            startDateDayLight: period,
            duration,
        };

        block.addSectionBlock({
            text: block.newMarkdownTextObject(lang.confirmRequestModal.lateOverview({
                user: null,
                type,
                ...msgData,
            } as any)),
        });

        // Warning late/end soon still have to tick on dead board
        if (remaining.late - duration < 0) {
            block.addSectionBlock({
                text: block.newMarkdownTextObject(limitLateDuration && limitLateDuration > 0
                    ? lang.confirmRequestModal.warningLateTick
                    : lang.confirmRequestModal.warningLateLimitedTick
                ),
            });
            // Store the warning state
            warningList.push({ name: WarningType.LATE_END, tick: 'black' });
        }
    }

    // Warning tick on dead board
    const isLateRequest = () => {
        const currentDate = new Date().getTime();
        const hourMs = 60 * 60 * 1000;
        const checkinTimeMorning = (getTotalHours(checkinTime.morning) - AppConfig.timezoneOffset) * hourMs;
        const checkinTimeAfternoon = (getTotalHours(checkinTime.afternoon) - AppConfig.timezoneOffset) * hourMs;
        const checkoutTimeMorning = (getTotalHours(checkoutTime.morning) - AppConfig.timezoneOffset) * hourMs;
        const checkoutTimeAfternoon = (getTotalHours(checkoutTime.afternoon) - AppConfig.timezoneOffset) * hourMs;
        const requestOffBeforeMilliseconds = requestOffBefore * hourMs;
        const requestWfhBeforeMilliseconds = requestWfhBefore * hourMs;
        const requestLateBeforeMilliseconds = requestLateBefore * hourMs;

        // The off request is sent late (during last 24 hours)
        if (type === RequestType.OFF) {
            const actualStartTime = period === TimePeriod.AFTERNOON
                ? startDate + checkinTimeAfternoon
                : startDate + checkinTimeMorning;
            if (actualStartTime - currentDate < requestOffBeforeMilliseconds) {
                return true;
            }
        }

        if (type === RequestType.WFH) {
            const actualStartTime = period === TimePeriod.AFTERNOON
                ? startDate + checkinTimeAfternoon
                : startDate + checkinTimeMorning;
            if (actualStartTime - currentDate < requestWfhBeforeMilliseconds) {
                return true;
            }
        }

        if (type === RequestType.LATE) {
            if (period === TimePeriod.MORNING) {

                const actualStartTime = startDate + checkinTimeMorning; // 9 AM

                if (actualStartTime - currentDate < requestLateBeforeMilliseconds) {
                    return true;
                }
            }

            if (period === TimePeriod.AFTERNOON) {
                const actualStartTime = startDate + checkinTimeAfternoon; // 2 PM

                if (actualStartTime - currentDate < requestLateBeforeMilliseconds) {
                    return true;
                }
            }
        }

        if (type === RequestType.END_SOON) {
            if (period === TimePeriod.MORNING) {
                const actualStartTime = startDate + checkoutTimeMorning; // 12:30 PM

                if (actualStartTime - currentDate < requestLateBeforeMilliseconds) {
                    return true;
                }
            }

            if (period === TimePeriod.AFTERNOON) {
                const actualStartTime = startDate + checkoutTimeAfternoon; // 6 PM

                if (actualStartTime - currentDate < requestLateBeforeMilliseconds) {
                    return true;
                }
            }
        }

        return false;
    }

    if (isLateRequest()) {
        block.addSectionBlock({
            text: block.newMarkdownTextObject(lang.confirmRequestModal.warningLateRequest),
        });

        warningList.push({ name: WarningType.LATE_REQUEST, tick: 'black' });
    }

    return {
        id: `confirmRequestOff--${JSON.stringify({
            warningList,
            formData,
            type,
            msgData,
        })}`,
        title: block.newPlainTextObject(lang.confirmRequestModal.heading),
        submit: block.newButtonElement({
            text: block.newPlainTextObject(lang.common.confirm),
            style: ButtonStyle.DANGER,
            value: JSON.stringify({
                warningList,
                formData,
                type,
                msgData,
            }),
        }),
        close: block.newButtonElement({
            text: block.newPlainTextObject(lang.common.cancel),
        }),
        blocks: block.getBlocks(),
    };
}

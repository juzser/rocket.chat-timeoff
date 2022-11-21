import { IModify } from '@rocket.chat/apps-engine/definition/accessors';
import { ButtonStyle } from '@rocket.chat/apps-engine/definition/uikit';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';

import { IOffWarning, RequestType, TimePeriod, WarningType, IFormData, IMemberOffRemain } from '../interfaces/IRequestLog';
import { lang } from '../lang/index';
import { buildOffMessageData, getTotalHours } from '../lib/helpers';
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

    const warningList: IOffWarning[] = [];
    const msgData = buildOffMessageData({ startDate, period, type, duration});

    if (type === RequestType.OFF || type === RequestType.WFH) {
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

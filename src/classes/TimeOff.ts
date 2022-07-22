import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { TimeOffApp as App } from '../../TimeOffApp';
import { IOffLog, IOffMessageData, IOffWarning, RequestType, TimePeriod, IFormData, IScheduleData, IScheduleLog } from '../interfaces/IRequestLog';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { lang } from '../lang/index';
import { confirmRequestModal } from '../modals/confirmRequestModal';
import { createOffLog, createScheduleData, getOffLogByUser, getRemainingOff, getScheduleData, updateScheduleData } from '../lib/services';
import { offlogBlock } from '../messages/offlogBlock';
import { convertDateToTimestamp, convertTimestampToDate, sendMessage } from '../lib/helpers';
import { AppConfig } from '../lib/config';
import { dailylogBlock } from '../messages/dailylogBlock';

export class TimeOff {
    constructor(
        private readonly app: App,
    ) {}

    // Submit the form
    public async submitFormData({ requestType, sender, room, formData, read, persis, modify, triggerId }: {
        requestType: RequestType,
        sender: IUser,
        room: IRoom,
        formData: IFormData,
        read: IRead,
        persis: IPersistence,
        modify: IModify,
        triggerId: string,
    }) {
        // Validate
        const error = this.validateFormData(requestType, formData);

        if (error) {
            throw error;
        }

        // Get remaining
        const offRemaining = await getRemainingOff({
            dayoffPerMonth: this.app.dayoffPerMonth,
            wfhPerMonth: this.app.totalWfhDays,
            limitLateDuration: this.app.limitLateDuration,
            userId: sender.id,
            read,
            persis,
        });

        // Open confirm modal
        const modal = await confirmRequestModal({
            type: requestType,
            modify,
            room,
            formData,
            remaining: offRemaining,
            checkinTime: this.app.checkinTime,
            checkoutTime: this.app.checkoutTime,
            requestOffBefore: this.app.requestOffBefore,
            requestWfhBefore: this.app.requestWfhBefore,
            requestLateBefore: this.app.requestLateBefore,
        });

        await modify.getUiController().openModalView(modal, { triggerId }, sender);
    }

    // Final request submit - After confirmed
    public async submitRequest({ type, read, modify, sender, formData, msgData, warningList, persis }: {
        type: RequestType;
        read: IRead;
        modify: IModify;
        sender: string;
        formData: IFormData;
        msgData: IOffMessageData;
        warningList: IOffWarning[];
        persis: IPersistence;
    }) {
        // Display message in log room
        const logRoom = await read.getRoomReader().getByName(this.app.offLogRoom);
        const user = await read.getUserReader().getByUsername(sender);

        if (!logRoom || !user) {
            throw ('Room or user not found');
        }

        const messageLogBlock = modify.getCreator().getBlockBuilder();
        await offlogBlock({
            username: sender,
            block: messageLogBlock,
            type,
            msgData,
            formData,
            warningList,
        });

        const messageLogId = await sendMessage({
            app: this.app,
            modify,
            room: logRoom,
            blocks: messageLogBlock,
            avatar: AppConfig.offIcon,
        });

        if (!messageLogId) {
            throw ('Error sending message');
        }

        // Save to association
        const logData: IOffLog = {
            id: `${user.id}_${messageLogId}`,
            user_id: user.id,
            msg_id: messageLogId,
            type,
            createdDate: new Date().getTime(),
            approved: true,
            startDate: formData.startDate,
            period: formData.period,
            duration: formData.duration,
            reason: formData.reason,
        }

        await createOffLog(user.id, persis, logData);

        // Create schedule job to notice in log room
        const listSchedule = await getScheduleData(read);

        const newListSchedule = listSchedule && listSchedule.length > 0 ? [...listSchedule] : [];

        // Total day of Late/EndSoon is only 1 day
        const totalDays = (type === RequestType.OFF || type === RequestType.WFH)
            ? Math.ceil(formData.duration)
            : 1;

        for (let i = 0; i < totalDays; i++) {
            const newDate = new Date(formData.startDate);
            newDate.setDate(newDate.getDate() + i);

            // Ignore weekends
            if (newDate.getDay() === 0) {
                newDate.setDate(newDate.getDate() + 1);
            }

            if (newDate.getDay() === 6) {
                newDate.setDate(newDate.getDate() + 2);
            }

            const scheduleLogIndex = newListSchedule.findIndex((e) => e.date === convertTimestampToDate(newDate.getTime()));

            // If the [i] day is mid of off duration, that means the period is whole day
            // Or the [i] day is end of off duration, that means the period is remaining off period
            let actualPeriod = formData.period;

            if (i > 0) {
                if (i < totalDays - 1) {
                    actualPeriod = TimePeriod.DAY;
                } else if (i === totalDays - 1) {
                    actualPeriod = msgData.endDateDayLight as TimePeriod;
                }
            }

            // Build the log
            const logData: IScheduleLog = {
                username: sender,
                type,
                period: actualPeriod,
                duration: formData.duration,
            };

            if (scheduleLogIndex === -1) {
                // Create new log
                newListSchedule.push({
                    date: convertTimestampToDate(newDate.getTime()),
                    logs: [logData],
                });
            } else {
                // Push to existing list
                newListSchedule[scheduleLogIndex].logs.push(logData);
            }
        }

        this.app.getLogger().info(JSON.stringify(listSchedule));
        this.app.getLogger().info(newListSchedule);

        if (!listSchedule) {
            await createScheduleData(newListSchedule, persis);
        } else {
            await updateScheduleData(newListSchedule, persis);
        }
    }

    // Send daily off list message to log room
    public async scheduleLogDaily({ read, modify }: {
        read: IRead;
        modify: IModify;
    }) {
        const listSchedule = await getScheduleData(read);

        if (!listSchedule) {
            return;
        }

        const today = convertTimestampToDate(new Date().getTime());
        const todayLog = listSchedule.find((e) => e.date === today);

        if (!todayLog) {
            return;
        }

        // Send log message
        const logRoom = await read.getRoomReader().getByName(this.app.offLogRoom);

        if (!logRoom) {
            return;
        }

        const messageLogBlock = modify.getCreator().getBlockBuilder();
        await dailylogBlock({
            block: messageLogBlock,
            date: todayLog.date,
            logs: todayLog.logs,
        });

        return await sendMessage({
            app: this.app,
            modify,
            room: logRoom,
            blocks: messageLogBlock,
            avatar: AppConfig.offLogIcon,
        });
    }

    private validateFormData(type: RequestType, formData: IFormData) {
        const today = (new Date()).setHours(-1, 0, 0, 0);

        // Null or passed date
        if (!formData.startDate || formData.startDate < today) {
            return { [`${type}StartDate`]: lang.error.form.startDate };
        }

        // Weekends
        const startDay = new Date(formData.startDate).getDay();
        if (startDay === 0 || startDay === 6) {
            return { [`${type}StartDate`]: lang.error.form.startDate };
        }

        if (!formData.period) {
            return { [`${type}Period`]: lang.error.form.period };
        }

        // Pick whole day but duration less than 1
        if (formData.period === TimePeriod.DAY && formData.duration < 1) {
            return { [`${type}Duration`]: lang.error.form.underDuration };
        }

        // Null or duration is 0
        if (!formData.duration || formData.duration < 0.5) {
            return { [`${type}Duration`]: lang.error.form.duration };
        }

        if (!formData.reason || formData.reason.length < 10) {
            return { [`${type}Reason`]: lang.error.form.reason };
        }

        // Late/End time cannot large than 120 minutes
        if ((type === RequestType.LATE || type === RequestType.END_SOON)
            && formData.duration > 120
        ) {
            return { [`${type}Duration`]: lang.error.form.overDuration };
        }

        return false;
    }
}

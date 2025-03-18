import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { IUIKitBlockIncomingInteraction } from '@rocket.chat/apps-engine/definition/uikit/UIKitIncomingInteractionTypes';
import { TimeOffApp as App } from '../../TimeOffApp';
import { IOffLog, IOffMessageData, IOffWarning, RequestType, TimePeriod, IFormData, IScheduleLog } from '../interfaces/IRequestLog';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { lang } from '../lang/index';
import { confirmRequestModal } from '../modals/confirmRequestModal';
import { createOffLog, getRemainingOff, getScheduleData, updateScheduleData, getOffLogsByMsgId, removeOffLogByMsgId } from '../lib/services';
import { offlogBlock } from '../messages/offlogBlock';
import { buildOffMessageData, checkIsPendingRequest, convertDateToTimestamp, convertTimestampToDate, notifyUser, sendMessage, updateMessage } from '../lib/helpers';
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
            formData,
            remaining: offRemaining,
            checkinTime: this.app.checkinTime,
            checkoutTime: this.app.checkoutTime,
            requestOffBefore: this.app.requestOffBefore,
            requestWfhBefore: this.app.requestWfhBefore,
            requestLateBefore: this.app.requestLateBefore,
            limitLateDuration: this.app.limitLateDuration,
        });

        try {
            this.app.getLogger().info(`${sender.username} requested ${requestType}`);
            setTimeout(async () => {
                await modify.getUiController().openModalView(modal, { triggerId }, sender)
            }, 300);
        } catch (err) {
            throw err;
        }
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
        const user = await read.getUserReader().getByUsername(sender);

        this.app.getLogger().info(this.app.offLogRoom);

        if (!this.app.offLogRoom || !user) {
            throw 'Room or user not found';
        }

        if (!formData) {
            throw 'There is no data';
        }

        const appId = this.app.getID();

        const messageLogBlock = await offlogBlock({
            appId,
            username: sender,
            type,
            msgData,
            formData,
            warningList,
        });

        const messageLogId = await sendMessage({
            app: this.app,
            modify,
            room: this.app.offLogRoom,
            blocks: messageLogBlock,
            avatar: AppConfig.offIcon,
        });

        this.app.getLogger().info(`before messageLogId: ${messageLogId}`);

        if (!messageLogId) {
            throw 'Error sending message';
        }

        this.app.getLogger().info(`messageLogId: ${messageLogId}`);

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
            warningList,
        }

        await createOffLog(persis, logData);

        this.app.getLogger().info(`Done create off log ${logData}`);

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
                msg_id: messageLogId,
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

        await updateScheduleData(newListSchedule, persis);
    }

    public async undoRequest({ data, read, modify, persis }: {
        data: IUIKitBlockIncomingInteraction,
        read: IRead,
        modify: IModify,
        persis: IPersistence,
    }) {
        if (!data.message || !data.message.id || !data.user) {
            throw lang.error.notAuthor;
        }

        const msgOffLog = await getOffLogsByMsgId(data.message.id, read);

        // No request found
        if (!msgOffLog) {
            throw lang.error.notActive;
        }

        // Not author
        if (msgOffLog.user_id !== data.user.id) {
            throw lang.error.notAuthor;
        }

        const isPending = checkIsPendingRequest({
            app: this.app,
            type: msgOffLog.type,
            startDate: msgOffLog.startDate,
            period: msgOffLog.period,
            duration: msgOffLog.duration,
        });

        if (!isPending) {
            throw lang.error.notPending;
        }

        // // Remove log
        await removeOffLogByMsgId(persis, data.message.id);

        const msgData = buildOffMessageData({
            startDate: msgOffLog.startDate,
            period: msgOffLog.period,
            duration: msgOffLog.duration,
            type: msgOffLog.type,
        });

        const formData = {
            startDate: msgOffLog.startDate,
            period: msgOffLog.period,
            duration: msgOffLog.duration,
            reason: msgOffLog.reason,
        };

        // Rebuild message
        const messageLogBlock = await offlogBlock({
            appId: this.app.getID(),
            username: data.user.username,
            type: msgOffLog.type,
            msgData,
            formData,
            warningList: msgOffLog.warningList,
            isCancelled: true,
        });

        await updateMessage({
            app: this.app,
            modify,
            messageId: data.message.id,
            sender: this.app.botUser,
            blocks: messageLogBlock,
        });

        // Remove schedule
        const listSchedule = await getScheduleData(read);

        if (listSchedule) {
          const newScheduleList = [...listSchedule];
          const dateScheduleIndex = newScheduleList.findIndex((e) => e.date === convertTimestampToDate(msgOffLog.startDate));

          this.app.getLogger().info(`date schedule: ${convertTimestampToDate(msgOffLog.startDate)} -- ${dateScheduleIndex}`);

          if (dateScheduleIndex !== -1) {
            const newScheduleLogs = newScheduleList[dateScheduleIndex].logs.filter((e) => e.msg_id !== data.message?.id);

            // Remove the date if no log left
            if (newScheduleLogs.length === 0) {
              newScheduleList.splice(dateScheduleIndex, 1);
            } else {
              newScheduleList[dateScheduleIndex].logs = [...newScheduleLogs];
            }

            await updateScheduleData(newScheduleList, persis);
          }
        }

        await notifyUser({
            app: this.app,
            message: lang.offLogMessage.cancelledSuccessful,
            user: data.user,
            room: data.room as IRoom,
            modify,
        });
    }

    // Send daily off list message to log room
    public async scheduleLogDaily({ read, modify, persis }: {
        read: IRead;
        modify: IModify;
        persis: IPersistence;
    }) {
        const listSchedule = await getScheduleData(read);
        this.app.getLogger().info(listSchedule);

        if (!listSchedule) {
            return;
        }

        const today = convertTimestampToDate(new Date().getTime());
        const todayLog = listSchedule.find((e) => e.date === today);

        if (!todayLog) {
            return;
        }

        // Send log message
        if (!this.app.offLogRoom) {
            return;
        }

        // Send message
        const messageLogBlock = await dailylogBlock({
            date: todayLog.date,
            logs: todayLog.logs,
        });

        await sendMessage({
            app: this.app,
            modify,
            room: this.app.offLogRoom,
            blocks: messageLogBlock,
            avatar: AppConfig.offLogIcon,
        });

        // Remove log from schedule
        const startOfToday = new Date().setHours(0, 0, 0, 0);

        const newListSchedule = listSchedule.filter((e) =>
            convertDateToTimestamp(e.date) >= startOfToday);
        return await updateScheduleData(newListSchedule, persis);
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

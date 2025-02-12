import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp } from '../../TimeOffApp';
import { WfhStatus } from '../interfaces/ITimeLog';
import { lang } from '../lang/index';
import { getDirect, notifyUser, sendMessage, updateMessage } from '../lib/helpers';
import {  getOffLogsByMonth, getTimeLogByMonth } from '../lib/services';
import { IUploadDescriptor } from '@rocket.chat/apps-engine/definition/uploads/IUploadDescriptor';
import { IOffLog, RequestType } from '../interfaces/IRequestLog';

export async function ExtractTimeLogCommand(app: TimeOffApp, context: SlashCommandContext, read: IRead, modify: IModify, persis: IPersistence, params?: Array<string>): Promise<void> {
    // Extract time log by month to csv
    const [ extractTime ] = params || []; // MM/YYYY

    const room = context.getRoom();

    const checkinRooms = app.checkinRoom.split(',');
    if (!checkinRooms.includes(room.slugifiedName)) {
        return await notifyUser({ app: this.app, message: lang.error.wrongRoom, user: context.getSender(), room: context.getRoom(), modify });
    }

    const [m, y] = extractTime.split('/');
    const month = parseInt(m, 10) - 1;
    const year = parseInt(y, 10);

    if (isNaN(month) || isNaN(year)) {
        return await notifyUser({ app, message: lang.error.somethingWrong, user: context.getSender(), room, modify });
    }

    // Get time logs of month
    const timeLogs = await getTimeLogByMonth(month, year, room, read);

    if (!timeLogs) {
        return await notifyUser({ app, message: lang.error.noTimelog, user: context.getSender(), room, modify });
    }

    const offLogData = await getOffLogsByMonth(month, year, read);

    // Group off logs by date
    const offLogsByDate: Record<string, IOffLog[]> = {};
    offLogData.forEach((log) => {
        const date = new Date(log.startDate).getDate();
        if (!offLogsByDate[`date-${date}`]) {
            offLogsByDate[`date-${date}`] = [];
        }
        offLogsByDate[`date-${date}`].push(log);
    });

    // Build csv content
    let csvContent = 'Date,Username,Start,Message,Pause,Message,Resume,Message,End,Message,Off,Message\n';

    timeLogs.forEach((log) => {
        const pureDate = log.id.split('_')[1]; // ddmmyyyy
        const date = `${pureDate.slice(0, 2)}/${parseInt(pureDate.slice(2, 4),10) + 1}/${pureDate.slice(4)}`;

        // Match date with off logs
        const offLogs = offLogsByDate[`date-${pureDate.slice(0, 2)}`] || [];

        log.memberActive.forEach((member) => {
            const {
                id,
                username,
                states,
            } = member;

            const start = states.find((state) => state.status === WfhStatus.START);
            const startTime = start ? new Date(start.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
            const startMessage = start ? start.message : '';

            const pause = states.find((state) => state.status === WfhStatus.PAUSE);
            const pauseTime = pause ? new Date(pause.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
            const pauseMessage = pause ? pause.message : '';

            const resume = states.find((state) => state.status === WfhStatus.RESUME);
            const resumeTime = resume ? new Date(resume.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
            const resumeMessage = resume ? resume.message : '';

            const end = states.find((state) => state.status === WfhStatus.END);
            const endTime = end ? new Date(end.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
            const endMessage = end ? end.message : '';

            // Find off log
            const memberOffLogs = offLogs.filter((off) => off.user_id === id);

            let offLogLateOrEnd = '';
            let offLogMessage = '';

            if (memberOffLogs.length > 0) {
                memberOffLogs.forEach((offLog) => {
                    if (offLog.type === RequestType.LATE) {
                        offLogLateOrEnd += `${lang.type.late} - ${offLog.duration} phút`;
                        offLogMessage += offLog.reason;
                    } else if (offLog.type === RequestType.END_SOON) {
                        offLogLateOrEnd += `${lang.type.endSoon} - ${offLog.duration} phút`;
                        offLogMessage += offLog.reason;
                    }
                });
            }

            csvContent += `${date},${username},${startTime},${startMessage},${pauseTime},${pauseMessage},${resumeTime},${resumeMessage},${endTime},${endMessage},${offLogLateOrEnd},${offLogMessage}\n`;
        });
    });

    // Send csv content to user by direct message
    const user = context.getSender();

    // Get direct room
    const directRoom = await getDirect(app, user.username, read, modify);

    if (!directRoom) {
        return await notifyUser({ app, message: lang.error.somethingWrong, user, room, modify });
    }

    // Create Buffer
    const buffer = Buffer.from(csvContent, 'utf8');

    const fileInfo: IUploadDescriptor = {
        filename: `time_log_${m}_${y}.csv`,
        room: directRoom,
        user,
    };

    const fileUploaded = await modify.getCreator().getUploadCreator().uploadBuffer(buffer, fileInfo);

    const message = `CSV time log ${extractTime}. Tải ở trên.`;
    // Send message
    await sendMessage({ app, message, room: directRoom, modify });
}

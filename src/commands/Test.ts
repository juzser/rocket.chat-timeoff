import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { IScheduleLog, RequestType, TimePeriod } from '../interfaces/IRequestLog';
import { buildOffMessageData, convertDateToTimestamp, convertTimestampToDate, notifyUser } from '../lib/helpers';
import { getOffLogs, getOffLogsByUserId, getScheduleData, updateScheduleData } from '../lib/services';
import { memberLogsModal } from '../modals/memberLogsModal';

// Open modal to request time off
export async function TestCommand({ app, context, read, persis, modify, params }: {
    app: appClass;
    context: SlashCommandContext;
    read: IRead;
    persis: IPersistence;
    modify: IModify
    params: string[];
}): Promise<void> {
   // Create schedule job to notice in log room
   const listSchedule = await getScheduleData(read);

   app.getLogger().info(listSchedule);

//    const offLogs = await getOffLogs(read);

//     const newListSchedule = listSchedule && listSchedule.length > 0 ? [...listSchedule] : [];

//     for (const offLog of offLogs) {
//         // Total day of Late/EndSoon is only 1 day
//         const totalDays = (offLog.type === RequestType.OFF || offLog.type === RequestType.WFH)
//             ? Math.ceil(offLog.duration)
//             : 1;

//         for (let i = 0; i < totalDays; i++) {
//             const newDate = new Date(offLog.startDate);
//             newDate.setDate(newDate.getDate() + i);

//             // Ignore weekends
//             if (newDate.getDay() === 0) {
//                 newDate.setDate(newDate.getDate() + 1);
//             }

//             if (newDate.getDay() === 6) {
//                 newDate.setDate(newDate.getDate() + 2);
//             }

//             const startOfToday = new Date();
//             startOfToday.setHours(0, 0, 0, 0);

//             if (newDate.getTime() < startOfToday.getTime()) {
//                 continue;
//             }

//             const scheduleLogIndex = newListSchedule.findIndex((e) => e.date === convertTimestampToDate(newDate.getTime()));

//             if (scheduleLogIndex > -1) {
//                 // Check if the log is already existed
//                 const logIndex = newListSchedule[scheduleLogIndex].logs.findIndex((e) => e.msg_id === offLog.msg_id);

//                 if (logIndex > -1) {
//                     continue;
//                 }
//             }

//             // If the [i] day is mid of off duration, that means the period is whole day
//             // Or the [i] day is end of off duration, that means the period is remaining off period
//             let actualPeriod = offLog.period;

//             if (i > 0) {
//                 if (i < totalDays - 1) {
//                     actualPeriod = TimePeriod.DAY;
//                 } else if (i === totalDays - 1) {
//                     const msgData = buildOffMessageData({
//                         startDate: offLog.startDate,
//                         period: offLog.period,
//                         duration: offLog.duration,
//                         type: offLog.type,
//                     });
//                     actualPeriod = msgData.endDateDayLight as TimePeriod;
//                 }
//             }

//             // Build the log
//             const user = await read.getUserReader().getById(offLog.user_id);

//             const logData: IScheduleLog = {
//                 msg_id: offLog.msg_id,
//                 username: user.username,
//                 type: offLog.type,
//                 period: actualPeriod,
//                 duration: offLog.duration,
//             };

//             if (scheduleLogIndex === -1) {
//                 // Create new log
//                 newListSchedule.push({
//                     date: convertTimestampToDate(newDate.getTime()),
//                     logs: [logData],
//                 });
//             } else {
//                 // Push to existing list
//                 newListSchedule[scheduleLogIndex].logs.push(logData);
//             }
//         }
//     }

//     const startOfToday = new Date().setHours(0, 0, 0, 0);

//     const newList = newListSchedule.filter((e) =>
//     convertDateToTimestamp(e.date) >= startOfToday);

//     app.getLogger().info(newList);
//     await updateScheduleData(newList, persis);
}

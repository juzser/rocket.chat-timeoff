import { IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { convertTimestampToDate, getTimeLogId, getTotalDayOff, getTotalDayWfh } from './helpers';

import { IMemberStatus, ITimeLog, WfhStatus } from '../interfaces/ITimeLog';
import { IMemberExtra, IMemberOffRemain, IOffLog, IScheduleData, RequestType } from '../interfaces/IRequestLog';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

const TIME_LOG_KEY = 'timeoff-log';
const OFF_LOG_KEY = 'timeoff-log';
const OFF_MEMBER_KEY = 'timeoff-member';
const OFF_SCHEDULE_KEY = 'timeoff-schedule';

/**
 * Create a Time Log
 *
 * @param data
 * @param persis
 */
export async function updateTimeLog(time: number, roomName: string, messageId: string, data: ITimeLog, persis: IPersistence): Promise<boolean> {
    const day = new Date(time).getDate();
    const month = new Date(time).getMonth();
    const year = new Date(time).getFullYear();

    const associations: RocketChatAssociationRecord[] = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, TIME_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `year-${year.toString()}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `month-${month.toString()}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `day-${day.toString()}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MESSAGE, messageId),
        new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, roomName),
    ];

    try {
        await persis.updateByAssociations(associations, data, true);
    } catch (err) {
        console.warn(err);
        return false;
    }

    return true;
}

/**
 * Update time log by timelog in association
 *
 * @param newData
 * @param persis
 */
export async function updateSelfTimelog(timelog: ITimeLog, persis: IPersistence): Promise<boolean> {
    const { msgId, room, id } = timelog;

    // get day month year from id `room_ddmmyyyy`
    const dateFormat = id.split('_')[1];
    const day = +dateFormat.slice(0, 2);
    const month = +dateFormat.slice(2, 4);
    const year = +dateFormat.slice(4, 8);

    const associations = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, TIME_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `year-${year.toString()}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `month-${month.toString()}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `day-${day.toString()}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MESSAGE, msgId),
        new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room),
    ];
    try {
        await persis.updateByAssociations(associations, timelog, false);
    } catch (err) {
        console.warn(err);
        return false;
    }

    return true;
}

/**
 * Get time log data by message
 *
 * @param id
 * @param read
 */
export async function getTimeLogByMessage(message: string, read: IRead): Promise<ITimeLog | null> {
    const associations = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, TIME_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MESSAGE, message),
    ];

    const data = await read.getPersistenceReader().readByAssociations(associations);

    return data[0] as ITimeLog;
}

/**
 * Get time log data by date, and room from association
 *
 * @param id
 * @param read
 */
export async function getTimeLogByDateRoom(time: number, roomName: string, read: IRead): Promise<ITimeLog | null> {
    const day = new Date(time).getDate();
    const month = new Date(time).getMonth();
    const year = new Date(time).getFullYear();

    const associations = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, TIME_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `year-${year.toString()}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `month-${month.toString()}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `day-${day.toString()}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, roomName),
    ];

    const data = await read.getPersistenceReader().readByAssociations(associations);

    return data[0] as ITimeLog;
}

/**
 * Get time log data by month & year & room from association
 *
 * @param month
 * @param year
 * @param room
 * @param read
 */
export async function getTimeLogByMonth(month: number, year: number, room: IRoom, read: IRead): Promise<ITimeLog[]> {
    const associations = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, TIME_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `year-${year.toString()}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `month-${month.toString()}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room.slugifiedName),
    ];

    const data = await read.getPersistenceReader().readByAssociations(associations);

    return data as ITimeLog[];
}

/**
 * Get current date time log data from association
 *
 * @param read
 */
export async function getCurrentTimeLog(room: IRoom, read: IRead): Promise<ITimeLog | null> {
    const currentDate = new Date();

    return getTimeLogByDateRoom(currentDate.getTime(), room.slugifiedName, read);
}

/**
 * Create a member time log status
 *
 * @param data
 * @param persis
 */
export async function updateMemberTimeLog(userId: string, status: WfhStatus, message: string, persis: IPersistence): Promise<boolean> {
    const associations: RocketChatAssociationRecord[] = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${TIME_LOG_KEY}-user`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.USER, userId),
    ];

    try {
        await persis.updateByAssociations(associations, { status, message }, true);
    } catch (err) {
        console.warn(err);
        return false;
    }

    return true;
}

/**
 * Get time log data by date, and room from association
 *
 * @param id
 * @param read
 */
export async function getTimeLogStatusByMember(id: string, read: IRead): Promise<IMemberStatus | null> {
    const associations = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${TIME_LOG_KEY}-user`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.USER, id),
    ];

    const data = await read.getPersistenceReader().readByAssociations(associations);

    return data[0] as IMemberStatus;
}

/**
 * Store the day off log
 */
export async function createOffLog(persis: IPersistence, data: IOffLog): Promise<boolean> {
    // Save to store
    const year = new Date(data.startDate).getFullYear();
    const month = new Date(data.startDate).getMonth();

    const associations: RocketChatAssociationRecord[] = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `off-year-${year}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `off-month-${month}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MESSAGE, data.msg_id),
        new RocketChatAssociationRecord(RocketChatAssociationModel.USER, data.user_id),
    ];

    try {
        await persis.updateByAssociations(associations, data, true);
    } catch (err) {
        console.warn(err);
        return false;
    }

    return true;
    // const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_LOG_KEY);
    // return persis.createWithAssociation(data, association);
}

/**
 * Update off logs
 */
export async function updateOffLog(persis: IPersistence, data: IOffLog): Promise<boolean> {
    const year = new Date(data.startDate).getFullYear();
    const month = new Date(data.startDate).getMonth();

    const associations = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `off-year-${year}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `off-month-${month}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MESSAGE, data.msg_id),
        new RocketChatAssociationRecord(RocketChatAssociationModel.USER, data.user_id),
    ];
    try {
        await persis.updateByAssociations(associations, data, false);
    } catch (err) {
        console.warn(err);
        return false;
    }

    return true;
}

/**
 * Remove off log by id
 */
export async function removeOffLogByMsgId(persis: IPersistence, msgId: string) {
    const associations = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MESSAGE, msgId),
    ];

    try {
        await persis.removeByAssociations(associations);
    } catch (err) {
        console.warn(err);
        return false;
    }

    return true;
}

/**
 * Get all off logs
 */
export async function getOffLogs(read: IRead): Promise<IOffLog[]> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_LOG_KEY);
    const data = await read.getPersistenceReader().readByAssociation(association);

    return data as IOffLog[];
}

/**
 * Get all off logs by user id
 */
export async function getOffLogsByUserId(userId: string, read: IRead): Promise<IOffLog[]> {
    const associations = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.USER, userId),
    ];

    const data = await read.getPersistenceReader().readByAssociations(associations);

    return data as IOffLog[];
}

/**
 * Get off logs by message id
 */
export async function getOffLogsByMsgId(msgId: string, read: IRead): Promise<IOffLog> {
    const associations = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MESSAGE, msgId),
    ];

    const data = await read.getPersistenceReader().readByAssociations(associations);

    return data[0] as IOffLog;
}

/**
 * Get off log by year
 */
export async function getOffLogsByYear(year: number, read: IRead): Promise<IOffLog[]> {
    const associations = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `off-year-${year}`),
    ];

    const data = await read.getPersistenceReader().readByAssociations(associations);

    return data as IOffLog[];
}

/**
 * Get off log by month
 */
export async function getOffLogsByMonth(month: number, year: number, read: IRead): Promise<IOffLog[]> {
    const associations = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `off-year-${year}`),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `off-month-${month}`),
    ];

    const data = await read.getPersistenceReader().readByAssociations(associations);

    return data as IOffLog[];
}

/**
 * Get off log by the date
 */
export async function getOffLogByDate(read: IRead, inputDate?: string): Promise<IOffLog[] | null> {
    const currentDate = new Date();

    // Split to parts [dd, mm, yyyy]
    const inputDateParts = inputDate
        ? inputDate.split('/')
        : [currentDate.getMonth() + 1, currentDate.getFullYear()];

    const year = inputDateParts.length === 3
        ? +inputDateParts[2]
        : inputDateParts.length === 2
            ? +inputDateParts[1]
            : +inputDateParts[0];

    const data = await getOffLogsByYear(year, read);

    if (!data.length) {
        return null;
    }

    const results = data.filter((item: IOffLog) => {
        const date = convertTimestampToDate(item.createdDate);
        const dateParts = date.split('/');

        // dd/mm/yyyy
        if (inputDateParts.length === 3) {
            return +dateParts[0] === +inputDateParts[0]
                && +dateParts[1] === +inputDateParts[1];
        }

        // mm/yyyy
        if (inputDateParts.length === 2) {
            return +dateParts[1] === +inputDateParts[0];
        }

        return true;
    });

    return results as IOffLog[];
}

/**
 * Update off information of member
 */
export async function updateOffMember(userId: string, year: number, persis: IPersistence, data: IMemberExtra): Promise<string> {
    // Save to store
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${OFF_MEMBER_KEY}_${userId}_${year}`);
    return persis.updateByAssociation(association, data, true);
}

/**
 * Get off information of member
 */
export async function getOffMemberByUser(userId: string, year: number, persis: IPersistence, read: IRead): Promise<IMemberExtra | null> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${OFF_MEMBER_KEY}_${userId}_${year}`);
    const data = await read.getPersistenceReader().readByAssociation(association);

    if (!data.length) {
        return null;
    }

    return data[0] as IMemberExtra;
}

/**
 * Get remaining off type for user
 */
export async function getRemainingOff({ dayoffPerMonth, wfhPerMonth, limitLateDuration, userId, read, persis, year }: {
    dayoffPerMonth: number;
    wfhPerMonth: number;
    limitLateDuration: number;
    userId: string;
    read: IRead;
    persis: IPersistence;
    year?: number;
}): Promise<IMemberOffRemain> {
    const currentYear = new Date().getFullYear();
    const yearLog = year ? year : currentYear;

    const user = await read.getUserReader().getById(userId);
    let userCreatedDate;

    if (user) {
        userCreatedDate = new Date(user.createdAt);
    }

    const totalDayOff = getTotalDayOff(dayoffPerMonth, yearLog, userCreatedDate);
    const totalWfh = getTotalDayWfh(wfhPerMonth, yearLog, userCreatedDate);
    const offLog = await getOffLogsByUserId(userId, read);
    const memberInfo = await getOffMemberByUser(userId, yearLog, persis, read);

    const total = {
        off: totalDayOff + (memberInfo?.offExtra || 0),
        wfh: totalWfh + (memberInfo?.wfhExtra || 0),
        late: limitLateDuration + (memberInfo?.lateExtra || 0),
    };

    const firstTimeofYear = new Date(yearLog, 0, 1).getTime();
    const firstTimeofMonth = new Date(yearLog, new Date().getMonth(), 1).getTime();

    const endDate = currentYear > yearLog
        ? new Date(yearLog, 11, 31).getTime()
        : new Date().getTime();

    // Only minus the time if it's valid
    // Off & wfh: approved & during this year
    // Late & end: approved & during this month
    offLog?.map((log) => {
        if (log.approved) {
            if ((log.type === RequestType.OFF || log.type === RequestType.WFH)
                && log.createdDate >= firstTimeofYear
                && log.createdDate <= endDate
            ) {
                total[log.type] -= log.duration;
            }

            if ((log.type === RequestType.LATE || log.type === RequestType.END_SOON)
                && log.createdDate >= firstTimeofMonth
            ) {
                total.late -= log.duration;
            }
        }
        return log;
    });

    return total;
}

/**
 * Update schedule data
 */
export async function updateScheduleData(data: IScheduleData[], persis: IPersistence): Promise<string> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_SCHEDULE_KEY);
    return persis.updateByAssociation(association, data, true);
}

/**
 * Remove schedule data
 */
export async function removeScheduleData(persis: IPersistence): Promise<object[]> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_SCHEDULE_KEY);
    return persis.removeByAssociation(association);
}

/**
 * Get schedule data from association
 */
export async function getScheduleData(read: IRead): Promise<IScheduleData[] | null> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_SCHEDULE_KEY);
    const data = await read.getPersistenceReader().readByAssociation(association);

    if (!data.length) {
        return null;
    }

    return data[0] as IScheduleData[];
}

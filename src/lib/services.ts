import { IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { convertTimestampToDate, getTimeLogId, getTotalDayOff, getTotalDayWfh } from './helpers';

import { ITimeLog } from '../interfaces/ITimeLog';
import { IMemberExtra, IMemberOffRemain, IOffLog, IScheduleData, RequestType } from '../interfaces/IRequestLog';

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
export async function createTimeLog(id: string, data: ITimeLog, persis: IPersistence): Promise<string> {
    // Save to store
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${TIME_LOG_KEY}_${id}`);
    return persis.createWithAssociation(data, association);
}

/**
 * Update time log by id in association
 *
 * @param newData
 * @param persis
 */
export async function updateTimelogById(id: string, newData: ITimeLog, persis: IPersistence): Promise<string> {
    // Save to store
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${TIME_LOG_KEY}_${id}`);
    return persis.updateByAssociation(association, newData);
}

/**
 * Get time log data by ID from association
 *
 * @param id
 * @param read
 */
export async function getTimeLogById(id: string, read: IRead): Promise<ITimeLog | null> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${TIME_LOG_KEY}_${id}`);
    const data = await read.getPersistenceReader().readByAssociation(association);

    if (!data.length) {
        return null;
    }

    return data[0] as ITimeLog;
}

/**
 * Get current date time log data from association
 *
 * @param read
 */
export async function getCurrentTimeLog(room: IRoom, read: IRead): Promise<ITimeLog | null> {
    const currentDate = new Date();
    const id = getTimeLogId(currentDate.getTime(), room.slugifiedName);

    return getTimeLogById(id, read);
}

/**
 * Store the day off log
 */
export async function createOffLog(persis: IPersistence, data: IOffLog): Promise<boolean> {
    // Save to store
    const year = new Date(data.startDate).getFullYear();

    const associations: RocketChatAssociationRecord[] = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `off-year-${year}`),
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

    const associations = [
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_LOG_KEY),
        new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `off-year-${year}`),
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

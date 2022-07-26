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
export async function createOffLog(persis: IPersistence, data: IOffLog): Promise<string> {
    // Save to store
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_LOG_KEY);
    return persis.createWithAssociation(data, association);
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
 * Get day off log data by user ID from association
 */
export async function getOffLogByUser(userId: string, read: IRead): Promise<IOffLog[] | null> {
    const data = await getOffLogs(read);

    if (!data.length) {
        return null;
    }

    const results = data.filter((item: IOffLog) => item.user_id === userId);

    return results as IOffLog[];
}

/**
 * Get off log by the date
 */
export async function getOffLogByDate(read: IRead, inputDate?: string): Promise<IOffLog[] | null> {
    const data = await getOffLogs(read);

    if (!data.length) {
        return null;
    }

    const currentDate = new Date();
    const inputDateParts = inputDate
        ? inputDate.split('/')
        : [currentDate.getMonth() + 1, currentDate.getFullYear()];

    const results = data.filter((item: IOffLog) => {
        const date = convertTimestampToDate(item.createdDate);
        const dateParts = date.split('/');

        // dd/mm/yyyy
        if (inputDateParts.length === 3) {
            return +dateParts[0] === +inputDateParts[0]
                && +dateParts[1] === +inputDateParts[1]
                && +dateParts[2] === +inputDateParts[2];
        }

        // mm/yyyy
        if (inputDateParts.length === 2) {
            return +dateParts[1] === +inputDateParts[0]
                && +dateParts[2] === +inputDateParts[1];
        }

        // yyyy
        return +dateParts[2] === +inputDateParts[0];
    });

    return results as IOffLog[];
}

/**
 * Store the off information of member
 */
export async function createOffMember(userId: string, year: number, persis: IPersistence, data: IMemberExtra): Promise<string> {
    // Save to store
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${OFF_MEMBER_KEY}_${userId}_${year}`);
    return persis.createWithAssociation(data, association);
}

/**
 * Update off information of member
 */
export async function updateOffMember(userId: string, year: number, persis: IPersistence, data: IMemberExtra): Promise<string> {
    // Save to store
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${OFF_MEMBER_KEY}_${userId}_${year}`);
    return persis.updateByAssociation(association, data);
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

    const totalDayOff = getTotalDayOff(dayoffPerMonth, year && year < currentYear ? true : false);
    const totalWfh = getTotalDayWfh(wfhPerMonth, year && year < currentYear ? true : false);
    const offLog = await getOffLogByUser(userId, read);
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
 * Create schedule data
 */
export async function createScheduleData(data: IScheduleData[], persis: IPersistence): Promise<string> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_SCHEDULE_KEY);
    return persis.createWithAssociation(data, association);
}

/**
 * Update schedule data
 */
export async function updateScheduleData(data: IScheduleData[], persis: IPersistence): Promise<string> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, OFF_SCHEDULE_KEY);
    return persis.updateByAssociation(association, data);
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

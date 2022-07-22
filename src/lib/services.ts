import { IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { getTimeLogId, getTotalDayOff, getTotalDayWfh } from './helpers';

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
export async function createOffLog(userId: string, persis: IPersistence, data: IOffLog): Promise<string> {
    // Save to store
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${OFF_LOG_KEY}_${userId}`);
    return persis.createWithAssociation(data, association);
}

/**
 * Get day off log data by user ID from association
 */
export async function getOffLogByUser(userId: string, read: IRead): Promise<IOffLog[] | null> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${OFF_LOG_KEY}_${userId}`);
    const data = await read.getPersistenceReader().readByAssociation(association);

    if (!data.length) {
        return null;
    }

    return data as IOffLog[];
}

/**
 * Store the off information of member
 */
export async function createOffMember(userId: string, persis: IPersistence, data: IMemberExtra): Promise<string> {
    // Save to store
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${OFF_MEMBER_KEY}_${userId}`);
    return persis.createWithAssociation(data, association);
}

/**
 * Update off information of member
 */
export async function updateOffMember(userId: string, persis: IPersistence, data: IMemberExtra): Promise<string> {
    // Save to store
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${OFF_MEMBER_KEY}_${userId}`);
    return persis.updateByAssociation(association, data);
}

/**
 * Get off information of member
 */
export async function getOffMemberByUser(userId: string, persis: IPersistence, read: IRead): Promise<IMemberExtra | null> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${OFF_MEMBER_KEY}_${userId}`);
    const data = await read.getPersistenceReader().readByAssociation(association);

    if (!data.length) {
        return null;
    }

    return data[0] as IMemberExtra;
}

/**
 * Get remaining off type for user
 */
export async function getRemainingOff({ dayoffPerMonth, wfhPerMonth, limitLateDuration, userId, read, persis }: {
    dayoffPerMonth: number;
    wfhPerMonth: number;
    limitLateDuration: number;
    userId: string;
    read: IRead;
    persis: IPersistence;
}): Promise<IMemberOffRemain> {
    const totalDayOff = getTotalDayOff(dayoffPerMonth);
    const totalWfh = getTotalDayWfh(wfhPerMonth);
    const offLog = await getOffLogByUser(userId, read);
    const memberInfo = await getOffMemberByUser(userId, persis, read);

    const result = {
        off: totalDayOff + (memberInfo?.offExtra || 0),
        wfh: totalWfh + (memberInfo?.wfhExtra || 0),
        late: limitLateDuration + (memberInfo?.lateExtra || 0),
    };

    const firstTimeofYear = new Date(new Date().getFullYear(), 0, 1).getTime();
    const firstTimeofMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    // Only minus the time if it's valid
    // Off & wfh: approved & during this year
    // Late & end: approved & during this month
    offLog?.map((log) => {
        if (log.approved) {
            if ((log.type === RequestType.OFF || log.type === RequestType.WFH)
                && log.startDate >= firstTimeofYear
            ) {
                result[log.type] -= log.duration;
            }

            if ((log.type === RequestType.LATE || log.type === RequestType.END_SOON)
                && log.startDate >= firstTimeofMonth
            ) {
                result.late -= log.duration;
            }
        }
        return log;
    });

    return result;
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

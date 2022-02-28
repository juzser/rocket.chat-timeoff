import { IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';

import { TimeOffApp as AppClass } from '../../TimeOffApp';

import { ITimeLog } from '../interfaces/ITimeLog';

const timeLogKey = 'timeoff-log';

/**
 * Create a Time Log
 *
 * @param data
 * @param persis
 */
export async function createTimeLog(id: string, room: IRoom, data: ITimeLog, persis: IPersistence): Promise<string> {
    // Save to store
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${timeLogKey}_${id}`);
    return persis.createWithAssociation(data, association);
}

/**
 * Update time log by id in association
 *
 * @param newData
 * @param persis
 */
export async function updateTimelogById(id: string, room: IRoom, newData: ITimeLog, persis: IPersistence): Promise<string> {
    // Save to store
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${timeLogKey}_${id}`);
    return persis.updateByAssociation(association, newData);
}

/**
 * Get time log data by ID from association
 *
 * @param id
 * @param read
 */
export async function getTimeLogById(id: string, room: IRoom, read: IRead): Promise<ITimeLog | null> {
    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `${timeLogKey}_${id}`);
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

    return getTimeLogById(id, room, read);
}

/**
 * Convert timestamp to time log id ddmmyyyy
 *
 * @param time
 */
export function getTimeLogId(time: number, roomSlug: string): string {
    const datetime = new Date(time);

    const date = datetime.getDate();
    const dateStr = date > 9
        ? `${date}`
        : `0${date}`;

    const month = datetime.getMonth();
    const monthStr = month > 9
        ? `${month}`
        : `0${month}`;

    const year = datetime.getFullYear();

    return `${roomSlug}_${dateStr}${monthStr}${year}`;
}

/**
 * Get time string hh:mm
 *
 * @param time
 */
export function getTimeHour(time: number): string {
    const datetime = new Date(time);

    const hour = datetime.getHours();
    const hourStr = hour > 9
        ? `${hour}`
        : `0${hour}`;

    const minute = datetime.getMinutes();
    const minuteStr = minute > 9
        ? `${minute}`
        : `0${minute}`;

    return `${hourStr}:${minuteStr}`;
}

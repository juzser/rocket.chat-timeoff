import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAttachment } from '@rocket.chat/apps-engine/definition/messages';
import { IRoom, RoomType } from '@rocket.chat/apps-engine/definition/rooms';
import { BlockBuilder } from '@rocket.chat/apps-engine/definition/uikit';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { TimeOffApp as appClass } from '../../TimeOffApp';
import { AppConfig } from './config';

/**
 * Sends a message using bot
 *
 * @param app
 * @param modify
 * @param room Where to send message to
 * @param message (optional) What to send
 * @param attachments (optional) Message attachments
 * @param blocks (optional) Message blocks
 *
 * @returns messageId
 */
export async function sendMessage({ app, modify, room, message, attachments, blocks, avatar, group }: {
    app: appClass,
    modify: IModify,
    room: IRoom,
    message?: string,
    attachments?: Array<IMessageAttachment>,
    blocks?: BlockBuilder,
    avatar?: string,
    group?: boolean,
}): Promise<string | undefined> {
    const msg = modify.getCreator().startMessage()
        .setGroupable(group || false)
        .setSender(app.botUser)
        .setUsernameAlias(AppConfig.alias)
        .setAvatarUrl(avatar || AppConfig.avatar)
        .setRoom(room);

    if (message && message.length > 0) {
        msg.setText(message);
    }
    if (attachments && attachments.length > 0) {
        msg.setAttachments(attachments);
    }
    if (blocks !== undefined) {
        msg.setBlocks(blocks);
    }

    try {
        return await modify.getCreator().finish(msg);
    } catch (error) {
        app.getLogger().log(error);
        return;
    }
}

/**
 * Notifies user using bot
 *
 * @param app
 * @param modify
 * @param user Who to notify
 * @param message What to send
 */
export async function notifyUser({ app, message, user, room, modify, blocks, attachments }: {
    app: appClass,
    message: string,
    user: IUser,
    room: IRoom,
    modify: IModify,
    attachments?: Array<IMessageAttachment>,
    blocks?: BlockBuilder,
}): Promise<void> {
    const msg = modify.getCreator().startMessage()
        .setSender(app.botUser)
        .setUsernameAlias(AppConfig.alias)
        .setAvatarUrl(AppConfig.avatar)
        .setText(message)
        .setRoom(room);

    if (blocks !== undefined) {
        msg.setBlocks(blocks);
    }
    if (attachments && attachments.length > 0) {
        msg.setAttachments(attachments);
    }

    const finalMsg = msg.getMessage();

    try {
        await modify.getNotifier().notifyUser(user, finalMsg);
    } catch (error) {
        app.getLogger().log(error);
    }
}

/**
 * Update a message using bot
 *
 * @param app
 * @param modify
 * @param messageId Update which message by id
 * @param message (optional) What to send
 * @param attachments (optional) Message attachments
 * @param blocks (optional) Message blocks
 *
 * @returns messageId
 */
export async function updateMessage({ app, modify, messageId, sender, message, attachments, blocks }: {
    app: appClass,
    modify: IModify,
    messageId: string,
    sender?: IUser,
    message?: string,
    attachments?: Array<IMessageAttachment>,
    blocks?: BlockBuilder,
}): Promise<void> {
    const msg = await modify.getUpdater().message(messageId, sender ? sender : app.botUser);
    msg.setEditor(msg.getSender());

    if (message && message.length > 0) {
        msg.setText(message);
    }
    if (attachments && attachments.length > 0) {
        msg.setAttachments(attachments);
    }
    if (blocks !== undefined) {
        msg.setBlocks(blocks);
    }

    try {
        return await modify.getUpdater().finish(msg);
    } catch (error) {
        app.getLogger().log(error);
        return;
    }
}

/**
 * Gets a direct message room between bot and another user, creating if it doesn't exist
 *
 * @param app
 * @param read
 * @param modify
 * @param username the username to create a direct with bot
 * @returns the room or undefined if botUser or botUsername is not set
 */
export async function getDirect(app: appClass, username: string, read: IRead, modify: IModify): Promise <IRoom | undefined > {
    if (app.botUsername) {
        const usernames = [app.botUsername, username];
        let room;
        try {
            room = await read.getRoomReader().getDirectByUsernames(usernames);
        } catch (error) {
            app.getLogger().log(error);
            return;
        }

        if (room) {
            return room;
        } else if (app.botUser) {
            // Create direct room between botUser and username
            const newRoom = modify.getCreator().startRoom()
                .setType(RoomType.DIRECT_MESSAGE)
                .setCreator(app.botUser)
                .setMembersToBeAddedByUsernames(usernames);
            const roomId = await modify.getCreator().finish(newRoom);
            return await read.getRoomReader().getById(roomId);
        }
    }
    return;
}

/**
 * Get current room's members except BOTS
 */
export async function getMembersByRoom(app: appClass, room: IRoom, read: IRead): Promise<Array<IUser>> {
    let members;
    try {
        members = await read.getRoomReader().getMembers(room.id);
    } catch (error) {
        app.getLogger().log(error);
    }

    return members.filter((member) => !(/(rocket\.cat|app\.|\.bot|bot\.)/gi.test(member.username))) || [];
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

/**
 * Convert timestamp to date format dd/mm/yyyy
 */
export function convertTimestampToDate(timestamp: number): string {
    const date = new Date(timestamp);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Convert date format dd/mm/yyyy to timestamp
 */
export function convertDateToTimestamp(date: string): number {
    const dateArray = date.split('/');
    const day = parseInt(dateArray[0], 10);
    const month = parseInt(dateArray[1], 10);
    const year = parseInt(dateArray[2], 10);
    return new Date(year, month - 1, day).getTime();
}

/**
 * Round the number to the nearest float .5
 */
export function roundToHalf(num: number): number {
    return Math.round(num * 2) / 2;
}

/**
 * Get total day off by calculate the month of the year
 */
export function getTotalDayOff(dayoffPerMonth: number): number {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();

    return dayoffPerMonth * (currentMonth + 1);
}

/**
 * Get total day off by calculate the month of the year
 */
export function getTotalDayWfh(wfhPerMonth: number): number {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();

    return wfhPerMonth * (currentMonth + 1);
}

/**
 * Get total hours from hh:mm
 */
export function getTotalHours(time: string): number {
    const timeArray = time.split(':');
    return parseInt(timeArray[0], 10) + parseInt(timeArray[1], 10) / 60;
}

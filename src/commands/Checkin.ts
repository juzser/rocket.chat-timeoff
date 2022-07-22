import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { ITimeLog } from './../interfaces/ITimeLog';

import { TimeOffApp } from '../../TimeOffApp';
import { TimeLogCache } from '../cache/TimeLog';
import { IMemberState, IMemberTime, WfhStatus } from '../interfaces/ITimeLog';
import { lang } from '../lang/index';
import { AppConfig } from '../lib/config';
import { notifyUser, sendMessage, updateMessage } from '../lib/helpers';
import { createTimeLog, getTimeLogById, updateTimelogById } from '../lib/services';
import { getTimeLogId } from '../lib/helpers';
import { timelogBlock } from '../messages/timelogBlock';

export async function CheckinCommand(app: TimeOffApp, context: SlashCommandContext, read: IRead, modify: IModify, persis: IPersistence, params?: Array<string>): Promise<void> {
    const [ ...msgParams ] = params || [];

    const message = msgParams.join(' ');
    const room = context.getRoom();

    // Get member time
    const currentDate = new Date();
    const currentTime = currentDate.getTime();

    // Search user
    const user = context.getSender();
    const senderTime = currentTime + ((user.utcOffset - AppConfig.defaultTimezone) * 60 * 60 * 1000);

    // Get timelog from cache or DB
    const timelogId = getTimeLogId(currentTime, room.slugifiedName);
    let timelog = app.timelogCache && app.timelogCache.isValid()
        ? app.timelogCache.getTimeLogById(timelogId)
        : null;

    if (!timelog) {
        timelog = await getTimeLogById(timelogId, read);
    }

    // New member check-in
    const member: IMemberTime = {
        id: user.id,
        username: user.username,
        states: [],
    };

    const newState: IMemberState = {
        status: WfhStatus.START,
        timestamp: senderTime,
        message,
    };

    // Check if the message is still existed
    const validTimelog = timelog && await read.getMessageReader().getById(timelog.msgId)
        ? true
        : false;

    // Timelog found -> Update timelog
    if (validTimelog && timelog) {
        // Find existed member
        const memberIndex = timelog.memberActive.findIndex((u) => u.id === user.id);

        // Already in the list
        if (memberIndex > -1) {
            const tmpUserState = timelog.memberActive[memberIndex].states;
            const lastState = tmpUserState[tmpUserState.length - 1];

            // Error: Already started
            if (lastState.status === WfhStatus.START || lastState.status === WfhStatus.RESUME) {
                return await notifyUser({ app, message: lang.error.alreadyStart, user, room, modify });
            }

            // Success: Add new state
            newState.status = WfhStatus.RESUME; // Have status before
            timelog.memberActive[memberIndex].states.push(newState);
        } else {
            // Add new member check-in to existed timelog
            member.states.push(newState);
            timelog.memberActive.push(member);
        }

        // Update message block
        const block = modify.getCreator().getBlockBuilder();
        await timelogBlock({ block, memberData: timelog.memberActive });

        await updateMessage({
            app,
            modify,
            messageId: timelog.msgId,
            blocks: block,
        });

        // Cache new timelog
        app.timelogCache = new TimeLogCache(timelog);

        // Update existed timelog
        await updateTimelogById(timelogId, timelog, persis);
    } else {
        /**
         * No timelog for today -> OK current member is the first one
         */
        member.states.push(newState);

        // Create message block
        const block = modify.getCreator().getBlockBuilder();
        await timelogBlock({ block, memberData: [member] });

        const logMessageId = await sendMessage({
            app,
            modify,
            room,
            blocks: block,
        });

        if (!logMessageId) {
            return await notifyUser({ app, message: lang.error.somethingWrong, user, room, modify });
        }

        // Define new timelog
        const newTimelog: ITimeLog = {
            id: timelogId,
            room: room.slugifiedName,
            msgId: logMessageId,
            memberActive: [member],
        };

        // Cache new timelog
        app.timelogCache = new TimeLogCache(newTimelog);

        // Create record
        if (timelog) {
            await updateTimelogById(timelogId, newTimelog, persis);
        } else {
            await createTimeLog(timelogId, newTimelog, persis);
        }
    }

    // Temporary notify to user
    await notifyUser({ app, message: lang.checkin.startNotify, user, room, modify });
}

export async function CheckoutCommand(type: 'pause' | 'end', app: TimeOffApp, context: SlashCommandContext, read: IRead, modify: IModify, persis: IPersistence, params?: Array<string>): Promise<void> {
    const [ ...msgParams ] = params || [];

    const message = msgParams.join(' ');
    const room = context.getRoom();

    // Get member time
    const currentDate = new Date();
    const currentTime = currentDate.getTime();

    // Search user
    const user = context.getSender();
    const senderTime = currentTime + ((user.utcOffset - AppConfig.defaultTimezone) * 60 * 60 * 1000);

    // Get timelog from cache or DB
    const timelogId = getTimeLogId(currentTime, room.slugifiedName);
    let timelog = app.timelogCache && app.timelogCache.isValid()
        ? app.timelogCache.getTimeLogById(timelogId)
        : null;

    if(!timelog) {
        timelog = await getTimeLogById(timelogId, read);
    }

    const newState: IMemberState = {
        status: type === 'pause' ? WfhStatus.PAUSE : WfhStatus.END,
        timestamp: senderTime,
        message,
    };

    // Check if the message is still existed
    const validTimelog = timelog && await read.getMessageReader().getById(timelog.msgId)
        ? true
        : false;

    // No message
    if (!validTimelog || !timelog) {
        return await notifyUser({ app, message: lang.error.noTimelog, user, room, modify });
    }

    // Find existed member
    const memberIndex = timelog.memberActive.findIndex((u) => u.id === user.id);

    // No user
    if (memberIndex < 0) {
        return await notifyUser({ app, message: lang.error.alreadyEnd, user, room, modify });
    }

    // Already in the list
    const tmpUserState = timelog.memberActive[memberIndex].states;
    const lastState = tmpUserState[tmpUserState.length - 1];

    // Error: Already started
    if (lastState.status !== WfhStatus.START && lastState.status !== WfhStatus.RESUME) {
        return await notifyUser({ app, message: lang.error.alreadyEnd, user, room, modify });
    }

    // Success: Add new state
    timelog.memberActive[memberIndex].states.push(newState);

    // Update message block
    const block = modify.getCreator().getBlockBuilder();
    await timelogBlock({ block, memberData: timelog.memberActive });

    await updateMessage({
        app,
        modify,
        messageId: timelog.msgId,
        blocks: block,
    });

    // Cache new timelog
    app.timelogCache = new TimeLogCache(timelog);

    // Update existed timelog
    await updateTimelogById(timelogId, timelog, persis);

    // Temporary notify to user
    await notifyUser({ app, message: lang.checkin.endNotify, user, room, modify });
}

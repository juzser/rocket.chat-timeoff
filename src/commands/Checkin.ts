import { IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { ITimeLog } from './../interfaces/ITimeLog';

import { TimeOffApp } from '../../TimeOffApp';
import { IMemberState, IMemberTime, WfhStatus } from '../interfaces/ITimeLog';
import { lang } from '../lang/index';
import { AppConfig } from '../lib/config';
import { notifyUser, sendMessage, updateMessage } from '../lib/helpers';
import { updateTimeLog, getTimeLogStatusByMember, getTimeLogByDateRoom, updateMemberTimeLog, updateSelfTimelog, getTimeLogByMessage } from '../lib/services';
import { getTimeLogId } from '../lib/helpers';
import { timelogBlock } from '../messages/timelogBlock';

export async function CheckinStartCommand(app: TimeOffApp, context: SlashCommandContext, read: IRead, modify: IModify, persis: IPersistence, params?: Array<string>): Promise<void> {
    const [ ...msgParams ] = params || [];

    const message = msgParams.join(' ');
    const room = context.getRoom();

    // Get member time
    const currentDate = new Date();
    const currentTime = currentDate.getTime();

    // Search user
    const user = context.getSender();
    const senderTime = currentTime + ((user.utcOffset - AppConfig.defaultTimezone) * 60 * 60 * 1000);

    // Current member status
    const currentMemberStatus = await getTimeLogStatusByMember(user.id, read);

    // Already started
    if (
        message !== 'force'
        && (currentMemberStatus?.status === WfhStatus.START
            || currentMemberStatus?.status === WfhStatus.RESUME)
    ) {
        return await notifyUser({ app, message: lang.error.alreadyStart, user, room, modify });
    }

    // New member check-in
    const member: IMemberTime = {
        id: user.id,
        username: user.username,
        offset: user.utcOffset,
        states: [],
    };

    const newState: IMemberState = {
        status: WfhStatus.START,
        timestamp: senderTime,
        message,
    };

    member.states.push(newState);

    // get time log
    const timelogId = getTimeLogId(senderTime, room.slugifiedName);

    // Get current timelog from DB
    const timelog = await getTimeLogByDateRoom(senderTime, room.slugifiedName, read);

    // Still not found -> Create new timelog for today
    // This member is first one
    if (!timelog) {
        // Create message block
        const block = await timelogBlock({ memberData: [member] });

        // Send to channel
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

        // Update user status
        await updateMemberTimeLog(user.id, WfhStatus.START, logMessageId, persis);

        // Create record timelog
        await updateTimeLog(senderTime, room.slugifiedName, logMessageId, newTimelog, persis);

        // Temporary notify to user
        await notifyUser({ app, message: lang.checkin.startNotify, user, room, modify });

        return;
    }

    /**
     * Already existed timelog
     */
    // Check member existed
    const memberIndex = timelog.memberActive.findIndex((u) => u.id === user.id);

    // Non existed member
    if (memberIndex === -1) {
        // Update this member to list
        timelog.memberActive.push(member);

        // Update user status
        await updateMemberTimeLog(user.id, WfhStatus.START, timelog.msgId, persis);

        // Update existed timelog
        await updateSelfTimelog(timelog, persis);

        // Update message block
        await updateTimelogMessage(app, timelog, modify);

        // Temporary notify to user
        await notifyUser({ app, message: lang.checkin.startNotify, user, room, modify });

        return;
    }

    // Existed member -> Update status
    timelog.memberActive[memberIndex].states.push(newState);

    // Update user status
    await updateMemberTimeLog(user.id, WfhStatus.START, timelog.msgId, persis);

    // Update existed timelog
    await updateSelfTimelog(timelog, persis);

    // Update message block
    await updateTimelogMessage(app, timelog, modify);

    // Temporary notify to user
    await notifyUser({ app, message: lang.checkin.startNotify, user, room, modify });
}

export async function CheckinResumeCommand(app: TimeOffApp, context: SlashCommandContext, read: IRead, modify: IModify, persis: IPersistence, params?: Array<string>): Promise<void> {
    const [ ...msgParams ] = params || [];

    const message = msgParams.join(' ');
    const room = context.getRoom();

    // Get member time
    const currentDate = new Date();
    const currentTime = currentDate.getTime();

    // Search user
    const user = context.getSender();
    const senderTime = currentTime + ((user.utcOffset - AppConfig.defaultTimezone) * 60 * 60 * 1000);

    // Current member status
    const currentMemberStatus = await getTimeLogStatusByMember(user.id, read);

    // get time log
    if (!currentMemberStatus) {
        return await notifyUser({ app, message: lang.error.somethingWrong, user, room, modify });
    }

    // Already started
    if (currentMemberStatus.status === WfhStatus.START
        || currentMemberStatus.status === WfhStatus.RESUME
    ) {
        return await notifyUser({ app, message: lang.error.alreadyStart, user, room, modify });
    }

    const newState: IMemberState = {
        status: WfhStatus.RESUME,
        timestamp: senderTime,
        message,
    };

    // Check if the message is still existed
    const validTimelog = await read.getMessageReader().getById(currentMemberStatus.message)
        ? true
        : false;

    if (!validTimelog) {
        return await notifyUser({ app, message: lang.error.noTimelog, user, room, modify });
    }

    const timelog = await getTimeLogByMessage(currentMemberStatus.message, read);

    if (!timelog) {
        return await notifyUser({ app, message: lang.error.noTimelog, user, room, modify });
    }

    // Find existed member
    const memberIndex = timelog.memberActive.findIndex((u) => u.id === user.id);

    if (memberIndex === -1) {
        return await notifyUser({ app, message: lang.error.noTimelog, user, room, modify });
    }

    // Success: Add new state
    timelog.memberActive[memberIndex].states.push(newState);

    // Update user status
    await updateMemberTimeLog(user.id, WfhStatus.RESUME, timelog.msgId, persis);

    // Update existed timelog
    await updateSelfTimelog(timelog, persis);

    // Update message block
    await updateTimelogMessage(app, timelog, modify);

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

  // Current member status
  const currentMemberStatus = await getTimeLogStatusByMember(user.id, read);

  // get time log
  if (!currentMemberStatus) {
      return await notifyUser({ app, message: lang.error.somethingWrong, user, room, modify });
  }

  // Already ended
  if (currentMemberStatus.status === WfhStatus.END
    || currentMemberStatus.status === WfhStatus.PAUSE
  ) {
    return await notifyUser({ app, message: lang.error.alreadyEnd, user, room, modify });
  }

  const newState: IMemberState = {
    status: type === 'pause' ? WfhStatus.PAUSE : WfhStatus.END,
    timestamp: senderTime,
    message,
  };

  // Check if the message is still existed
  const validTimelog = await read.getMessageReader().getById(currentMemberStatus.message)
      ? true
      : false;

  if (!validTimelog) {
    return await notifyUser({ app, message: lang.error.noTimelog, user, room, modify });
  }

  const timelog = await getTimeLogByMessage(currentMemberStatus.message, read);

  if (!timelog) {
      return await notifyUser({ app, message: lang.error.noTimelog, user, room, modify });
  }

  // Find existed member
  const memberIndex = timelog.memberActive.findIndex((u) => u.id === user.id);

  // No user
  if (memberIndex < 0) {
      return await notifyUser({ app, message: lang.error.alreadyEnd, user, room, modify });
  }

  // Success: Add new state
  timelog.memberActive[memberIndex].states.push(newState);

  // Update user status
  await updateMemberTimeLog(
    user.id,
    type === 'pause' ? WfhStatus.PAUSE : WfhStatus.END,
    timelog.msgId,
    persis,
  );

  // Update existed timelog
  await updateSelfTimelog(timelog, persis);

  // Update message block
  await updateTimelogMessage(app, timelog, modify);

  // Temporary notify to user
  await notifyUser({ app, message: lang.checkin.endNotify, user, room, modify });
}

async function updateTimelogMessage(app: TimeOffApp, timelog: ITimeLog, modify: IModify): Promise<void> {
    const block = await timelogBlock({ memberData: timelog.memberActive });

    await updateMessage({
        app,
        modify,
        messageId: timelog.msgId,
        blocks: block,
    });
}

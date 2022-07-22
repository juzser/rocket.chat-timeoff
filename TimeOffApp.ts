import {
    IAppAccessors,
    IConfigurationExtend,
    IConfigurationModify,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { ISetting } from '@rocket.chat/apps-engine/definition/settings';
import { UIActionButtonContext } from '@rocket.chat/apps-engine/definition/ui';
import { IUIKitResponse, UIKitActionButtonInteractionContext, UIKitBlockInteractionContext, UIKitViewSubmitInteractionContext } from '@rocket.chat/apps-engine/definition/uikit';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { MembersCache } from './src/cache/Members';
import { TimeLogCache } from './src/cache/TimeLog';
import { OffCommand } from './src/commands/OffCommand';
import { WfhCommand } from './src/commands/WfhCommand';
import { IOffMessageData, IOffWarning, RequestType, TimePeriod, IFormData } from './src/interfaces/IRequestLog';
import { settings } from './src/lib/settings';
import { requestModal } from './src/modals/requestModal';
import { TimeOff } from './src/classes/TimeOff';
import { convertDateToTimestamp, notifyUser, roundToHalf } from './src/lib/helpers';
import { StartupType } from '@rocket.chat/apps-engine/definition/scheduler';
import { AppConfig } from './src/lib/config';

export class TimeOffApp extends App {
    /**
     * Settings
     */
    public botUsername: string;
    public botUser: IUser;
    public checkinRoom: string;
    public offLogRoom: string;
    public dayoffPerMonth: number;
    public totalWfhDays: number;
    public checkinTime: { morning: string, afternoon: string };
    public checkoutTime: { morning: string, afternoon: string };
    public limitLateDuration: number;
    public requestLateBefore: number;
    public requestOffBefore: number;
    public requestWfhBefore: number;
    public scheduleLogTime: number;
    public adminUsers: Array<string>;

    // Classes
    public timeoff: TimeOff;

    /**
     * Members cache
     */
    // tslint:disable-next-line:variable-name
    private _membersCache: MembersCache;

    /**
     * Timelog cache
     */
    // tslint:disable-next-line:variable-name
    private _timelogCache: TimeLogCache;

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    /**
     * Execute right after a view form submitted
     */
    public async executeViewSubmitHandler(context: UIKitViewSubmitInteractionContext, read: IRead, http: IHttp, persis: IPersistence, modify: IModify) {
        const data = context.getInteractionData();

        const { state } = data.view as any;

        // Request Modal
        if (data.view.id === 'modalRequestOff') {
            const { requestOff: {
                offType,
            }} = state;
            const room = await read.getRoomReader().getByName(this.offLogRoom);

            const date = new Date();
            let tomorrow = date.setDate(date.getDate() + 1);
            if (date.getDay() === 0) {
                tomorrow = date.setDate(date.getDate() + 1);
            }
            if (date.getDay() === 6) {
                tomorrow = date.setDate(date.getDate() + 2);
            }

            // Fallback value for inputs
            const defaultPeriod = offType === RequestType.OFF || offType === RequestType.WFH
                ? TimePeriod.DAY
                : (offType === RequestType.LATE
                    ? TimePeriod.MORNING
                    : TimePeriod.AFTERNOON
                );

            const defaultDuration = offType === RequestType.OFF
                || offType === RequestType.WFH
                ? 1 : 30;

            const formData = {
                startDate: state.inputData[`${offType}StartDate`]
                    ? convertDateToTimestamp(state.inputData[`${offType}StartDate`])
                    : tomorrow,
                period: state.inputData[`${offType}Period`] || defaultPeriod,
                duration: roundToHalf(+state.inputData[`${offType}Duration`] || defaultDuration),
                reason: state.inputData[`${offType}Reason`],
            };

            try {
                await this.timeoff.submitFormData({ sender: data.user, room: room as IRoom, requestType: offType, triggerId: data.triggerId, read, persis, modify, formData });
            } catch (err) {
                return context.getInteractionResponder().viewErrorResponse({
                    viewId: data.view.id,
                    errors: err,
                });
            }
        }

        if (data.view.id === 'confirmRequestOff') {
            const { warningList, formData, type, msgData }: {
                type: RequestType;
                msgData: IOffMessageData;
                warningList: IOffWarning[];
                formData: IFormData;
            } = JSON.parse(data.view.submit?.value || '{}');

            try {
                await this.timeoff.submitRequest({
                    read, modify, persis,
                    type,
                    sender: data.user.username,
                    formData,
                    msgData,
                    warningList,
                });
            } catch (err) {
                return await notifyUser({ app: this, message: err, user: data.user, room: data.room as IRoom, modify });
            }
        }

        return {
            success: true,
            state: data.view.state,
            user: data.user.username,
        };
    }

    /**
     * Execute when a button on message block clicked
     */
    public async executeBlockActionHandler(context: UIKitBlockInteractionContext, read: IRead, http: IHttp, persis: IPersistence, modify: IModify) {
        const data = context.getInteractionData();
        const { user, room, actionId } = data;

        switch (actionId) {
            // Re-render the modal form by changing off type
            case 'offType': {
                const modal = await requestModal({ app: this, user, modify, read, persis, requestType: data.value });
                return context.getInteractionResponder().updateModalViewResponse(modal);
            }
        }

        return {
            success: true,
            user: data.user.username,
            action: data.actionId,
            value: data.value,
            triggerId: data.triggerId,
        };
    }

    public async executeActionButtonHandler(
        context: UIKitActionButtonInteractionContext,
        read: IRead,
        http: IHttp,
        persis: IPersistence,
        modify: IModify
    ): Promise<IUIKitResponse> {
        const {
            buttonContext,
            actionId,
            triggerId,
            user,
            room,
            message,
        } = context.getInteractionData();

        if (actionId === 'off-request-trigger') {
            const modal = await requestModal({ app: this, user, modify, read, persis, requestType: RequestType.OFF });
            await modify.getUiController().openModalView(modal, { triggerId }, user);
        }

        return context.getInteractionResponder().successResponse();
    }

    /**
     * On app enabled
     */
    public async onEnable(environmentRead: IEnvironmentRead, configModify: IConfigurationModify): Promise<boolean> {
        this.timeoff = new TimeOff(this);

        // Get bot user by bot username
        this.botUsername = await environmentRead.getSettings().getValueById('bot_username');
        if (!this.botUsername) {
            return false;
        }

        this.botUser = await this.getAccessors().reader.getUserReader().getByUsername(this.botUsername) as IUser;

        // Get activity room by room name
        this.checkinRoom = await environmentRead.getSettings().getValueById('checkin_room');
        if (!this.checkinRoom) {
            return false;
        }

        this.offLogRoom = await environmentRead.getSettings().getValueById('timeoff_room');
        if (!this.offLogRoom) {
            return false;
        }

        // Admin users
        const adminSetting = await environmentRead.getSettings().getValueById('admin_list');
        if (adminSetting) {
            this.adminUsers = adminSetting.split(',').map((u: string) => u.trim());
        }

        // Get number of wfh & off days
        this.dayoffPerMonth = parseInt(await environmentRead.getSettings().getValueById('increase_dayoff_per_month'), 10);
        this.totalWfhDays = parseInt(await environmentRead.getSettings().getValueById('total_wfh_per_month'), 10);
        this.requestLateBefore = parseInt(await environmentRead.getSettings().getValueById('requestLate_before'), 10);
        this.requestOffBefore = parseInt(await environmentRead.getSettings().getValueById('requestOff_before'), 10);
        this.requestWfhBefore = parseInt(await environmentRead.getSettings().getValueById('requestWfh_before'), 10);
        this.limitLateDuration = parseInt(await environmentRead.getSettings().getValueById('limit_late_time'), 10);

        // Kick off schedule job
        this.scheduleLogTime = parseInt(await environmentRead.getSettings().getValueById('schedule_log_time'), 10);

        const actualLogTime = (this.scheduleLogTime - AppConfig.timezoneOffset) || 2; // 2:00 AM

        await configModify.scheduler.cancelJob('daily-off-log');
        await configModify.scheduler.scheduleRecurring({
            id: 'daily-off-log',
            interval: `0 ${actualLogTime} * * 1-5`,
            skipImmediate: true,
        });

        // Get Check-in time setting
        // Rewards
        const checkinSetting = await environmentRead.getSettings().getValueById('checkin_time');
        this.checkinTime = JSON.parse(checkinSetting);

        const checkoutSetting = await environmentRead.getSettings().getValueById('checkout_time');
        this.checkoutTime = JSON.parse(checkoutSetting);

        if (!this.checkinTime || !this.checkoutTime) {
            return false;
        }

        return true;
    }

    /**
     * Update values when settings are updated
     *
     * @param setting
     * @param configModify
     * @param read
     * @param http
     */
    public async onSettingUpdated(setting: ISetting, configModify: IConfigurationModify, read: IRead, http: IHttp): Promise<void> {
        switch (setting.id) {
            case 'bot_username':
                this.botUsername = setting.value;
                if (this.botUsername) {
                    this.botUser = await this.getAccessors().reader.getUserReader().getByUsername(this.botUsername) as IUser;
                }
                break;
            case 'checkin_room':
                if (setting.value) {
                    this.checkinRoom = setting.value;
                }
                break;
            case 'timeoff_room':
                if (setting.value) {
                    this.offLogRoom = setting.value;
                }
            case 'increase_dayoff_per_month':
                if (setting.value) {
                    this.dayoffPerMonth = +(setting.value);
                }
            case 'total_wfh_per_month':
                if (setting.value) {
                    this.totalWfhDays = +(setting.value);
                }
            case 'requestLate_before':
                if (setting.value) {
                    this.requestLateBefore = +(setting.value);
                }
            case 'requestOff_before':
                if (setting.value) {
                    this.requestOffBefore = +(setting.value);
                }
            case 'requestWfh_before':
                if (setting.value) {
                    this.requestWfhBefore = +(setting.value);
                }
            case 'limit_late_time':
                if (setting.value) {
                    this.limitLateDuration = +(setting.value);
                }
                break;
            case 'admin_list':
                const adminSetting = setting.value;
                if (adminSetting) {
                    this.adminUsers = adminSetting.split(',').map((u: string) => u.trim());
                }
                break;
            case 'checkin_time':
                if (setting.value) {
                    this.checkinTime = JSON.parse(setting.value);
                }
                break;
            case 'checkout_time':
                if (setting.value) {
                    this.checkoutTime = JSON.parse(setting.value);
                }
                break;
            case 'schedule_log_time':
                if (setting.value) {
                    this.scheduleLogTime = +(setting.value);

                    // Rerun the schedule task
                    const actualLogTime = (this.scheduleLogTime - AppConfig.timezoneOffset) || 2; // 2:00 AM
                    await configModify.scheduler.cancelJob('daily-off-log');
                    await configModify.scheduler.scheduleRecurring({
                        id: 'daily-off-log',
                        interval: `0 ${actualLogTime} * * 1-5`,
                        skipImmediate: true,
                    });
                }
                break;
        }
    }

    public async extendConfiguration(configuration: IConfigurationExtend): Promise<void> {
        // Settings
        await Promise.all(settings.map((setting) => configuration.settings.provideSetting(setting)));

        // Slash Command
        await configuration.slashCommands.provideSlashCommand(new OffCommand(this));
        await configuration.slashCommands.provideSlashCommand(new WfhCommand(this));

        configuration.ui.registerButton({
            actionId: 'off-request-trigger',
            labelI18n: 'off-request-trigger-label',
            context: UIActionButtonContext.MESSAGE_BOX_ACTION,
        });

        await configuration.scheduler.registerProcessors([{
            id: 'daily-off-log',
            processor: async (job, read, modify, http, persis) => {
                this.getLogger().info('Daily off log process started');
                await this.timeoff.scheduleLogDaily({ read, modify });
            },
        }]);
    }

    get membersCache(): MembersCache {
        return this._membersCache;
    }

    set membersCache(membersCache: MembersCache) {
        this._membersCache = membersCache;
    }

    get timelogCache(): TimeLogCache {
        return this._timelogCache;
    }

    set timelogCache(timelogCache: TimeLogCache) {
        this._timelogCache = timelogCache;
    }
}

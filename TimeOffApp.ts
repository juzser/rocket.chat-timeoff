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
import { UIKitBlockInteractionContext, UIKitViewSubmitInteractionContext } from '@rocket.chat/apps-engine/definition/uikit';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

import { MembersCache } from './src/cache/Members';
import { TimeLogCache } from './src/cache/TimeLog';
import { OffCommand } from './src/commands/OffCommand';
import { WfhCommand } from './src/commands/WfhCommand';
import { settings } from './src/lib/settings';
import { requestModal } from './src/modals/requestModal';

export class TimeOffApp extends App {
    /**
     * Settings
     */
    public botUsername: string;
    public botUser: IUser;

    public checkinRoom: string;

    public checkinTime: string;

    public checkoutTime: string;

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

        const {
            view,
        } = data;

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
            case 'offType': {
                const modal = await requestModal({ modify, room: room as IRoom, requestType: data.value });

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

    /**
     * On app enabled
     */
    public async onEnable(environmentRead: IEnvironmentRead, configModify: IConfigurationModify): Promise<boolean> {
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

        // Get Check-in time setting
        this.checkinTime = await environmentRead.getSettings().getValueById('checkin_time');
        this.checkoutTime = await environmentRead.getSettings().getValueById('checkout_time');

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
            case 'checkin_time':
                if (setting.value) {
                    this.checkinTime = setting.value;
                }
                break;
            case 'checkout_time':
                if (setting.value) {
                    this.checkoutTime = setting.value;
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

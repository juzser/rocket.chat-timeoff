import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';

export const settings: Array<ISetting> = [
    {
        id: 'bot_username',
        type: SettingType.STRING,
        packageValue: 'rocket.cat',
        required: true,
        public: false,
        i18nLabel: 'bot_username',
        i18nDescription: 'bot_username_desc',
    },
    {
        id: 'checkin_room',
        type: SettingType.STRING,
        packageValue: 'general',
        required: true,
        public: false,
        i18nLabel: 'checkin_room',
        i18nDescription: 'checkin_room_desc',
    },
    {
        id: 'timeoff_room',
        type: SettingType.STRING,
        packageValue: 'general',
        required: true,
        public: false,
        i18nLabel: 'timeoff_room',
        i18nDescription: 'timeoff_room_desc',
    },
    {
        id: 'enable_approval',
        type: SettingType.BOOLEAN,
        packageValue: true,
        required: false,
        public: false,
        i18nLabel: 'enable_approval',
        i18nDescription: 'enable_approval_desc',
    },
    {
        id: 'checkin_time',
        type: SettingType.STRING,
        packageValue: '09:00',
        required: true,
        public: false,
        i18nLabel: 'checkin_time',
        i18nDescription: 'checkin_time_desc',
    },
    {
        id: 'checkout_time',
        type: SettingType.STRING,
        packageValue: '18:00',
        required: true,
        public: false,
        i18nLabel: 'checkout_time',
        i18nDescription: 'checkout_time_desc',
    },
];

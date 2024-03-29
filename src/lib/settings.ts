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
        id: 'increase_dayoff_per_month',
        type: SettingType.NUMBER,
        packageValue: 1,
        required: true,
        public: false,
        i18nLabel: 'increase_dayoff_per_month',
        i18nDescription: 'increase_dayoff_per_month_desc',
    },
    {
        id: 'total_wfh_per_month',
        type: SettingType.NUMBER,
        packageValue: 2,
        required: true,
        public: false,
        i18nLabel: 'total_wfh_per_month',
        i18nDescription: 'total_wfh_per_month_desc',
    },
    {
        id: 'admin_list',
        type: SettingType.STRING,
        packageValue: 'rocket.cat',
        required: false,
        public: false,
        i18nLabel: 'admin_list',
        i18nDescription: 'admin_list_desc',
    },
    {
        id: 'checkin_time',
        type: SettingType.STRING,
        packageValue: '{ "morning": "9:00", "afternoon": "14:00" }',
        multiline: true,
        required: true,
        public: false,
        i18nLabel: 'checkin_time',
        i18nDescription: 'checkin_time_desc',
    },
    {
        id: 'checkout_time',
        type: SettingType.STRING,
        packageValue: '{ "morning": "12:30", "afternoon": "18:00" }',
        multiline: true,
        required: true,
        public: false,
        i18nLabel: 'checkout_time',
        i18nDescription: 'checkout_time_desc',
    },
    {
        id: 'requestLate_before',
        type: SettingType.STRING,
        packageValue: '2',
        required: true,
        public: false,
        i18nLabel: 'requestLate_before',
        i18nDescription: 'requestLate_before_desc',
    },
    {
        id: 'requestOff_before',
        type: SettingType.STRING,
        packageValue: '24',
        required: true,
        public: false,
        i18nLabel: 'requestOff_before',
        i18nDescription: 'requestOff_before_desc',
    },
    {
        id: 'requestWfh_before',
        type: SettingType.STRING,
        packageValue: '12',
        required: true,
        public: false,
        i18nLabel: 'requestWfh_before',
        i18nDescription: 'requestWfh_before_desc',
    },
    {
        id: 'schedule_log_time',
        type: SettingType.STRING,
        packageValue: '8',
        required: false,
        public: false,
        i18nLabel: 'schedule_log_time',
        i18nDescription: 'schedule_log_time_desc',
    },
    {
        id: 'limit_late_time',
        type: SettingType.STRING,
        packageValue: '120',
        required: false,
        public: false,
        i18nLabel: 'limit_late_time',
        i18nDescription: 'limit_late_time_desc',
    },
];

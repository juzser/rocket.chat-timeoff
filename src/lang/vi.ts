export const vi = {
    common: {
        confirm: 'Xác nhận',
        cancel: 'Huỷ',
        approve: 'Chấp nhận',
        decline: 'Từ chối',
        statusStart: ':white_check_mark:',
        statusPause: ':pause_button:',
        statusResume: ':white_check_mark:',
        statusEnded: ':zzz:',
        requestLabel: 'Xin phép',
        other: 'Khác',
        undo: 'Hủy xin phép',
    },

    day: {
        0: 'Chủ nhật',
        1: 'Thứ 2',
        2: 'Thứ 3',
        3: 'Thứ 4',
        4: 'Thứ 5',
        5: 'Thứ 6',
        6: 'Thứ 7',
    },

    period: {
        day: 'Cả ngày',
        morning: 'Sáng',
        afternoon: 'Chiều',
    },

    error: {
        startNotEnd: 'Bạn không thể start khi chưa kết thúc ngày làm việc trước đó bằng `end`',
        noTimelog: 'Không tìm thấy log cho ngày hôm nay.',
        alreadyStart: 'Bạn đã bắt đầu rồi hoặc chưa end lần trước.',
        alreadyEnd: 'Bạn chưa bắt đầu.',
        somethingWrong: 'Có lỗi, vui lòng thử lại.',
        wrongRoom: 'Bạn không thể check-in ở channel này',
        form: {
            startDate: 'Ngày bắt đầu không đúng',
            duration: 'Thời gian không đúng',
            overDuration: 'Thời gian xin phép quá dài, phải đổi sang xin nghỉ 0.5 buổi',
            underDuration: 'Số ngày nghỉ không khớp với thời gian',
            reason: 'Hãy nhập lý do (tối thiểu 10 ký tự)',
            period: 'Chưa chọn thời gian',
        },
        notAuthor: ':warning: Bạn không phải người tạo request này.',
        notActive: ':warning: Request này đã bị huỷ.',
        notPending: ':warning: Request này đã được thực hiện. Không thể huỷ.',
    },

    type: {
        off: 'Nghỉ',
        late: 'Đi muộn',
        endSoon: 'Nghỉ sớm',
        wfh: 'Work from home',
        lateEnd: 'Đi muộn/Về sớm',
    },

    message: {
        caption: (total: number) => `:house_with_garden: Hôm nay có tất cả *${total}* người work from home đã check-in.`,
        totalTime: (total: number) => `Total: *${(total / 3600000).toFixed(1)}h*`,
    },

    checkin: {
        startNotify: ':white_check_mark: Bạn đã checkin thành công.',
        endNotify: 'Bạn đã kết thúc phiên làm việc. Thank you :+1:',
    },

    requestModal: {
        caption: (off: number, wfh: number) => `Bạn còn :beach: *${off}* ngày nghỉ phép và :house_with_garden: *${wfh}* ngày WFH trong năm.`,
        heading: 'Xin phép',
        fields: {
            type: 'Chọn yêu cầu',
            startDate: (type: string) => {
                if (type === 'off') { return 'Ngày bắt đầu xin nghỉ (dd/mm/yyyy)'; }
                if (type === 'wfh') { return 'Ngày bắt đầu WFH (dd/mm/yyyy)'; }
                if (type === 'late') { return 'Ngày xin đi muộn (dd/mm/yyyy)'; }
                // End soon
                return 'Ngày xin nghỉ sớm (dd/mm/yyyy)';
            },
            period: (type: string) => {
                if (type === 'off') { return 'Thời gian xin nghỉ'; }
                if (type === 'wfh') { return 'Thời gian WFH'; }
                if (type === 'late') { return 'Thời gian xin đi muộn'; }
                // End soon
                return 'Thời gian xin nghỉ sớm';
            },
            duration: (type: string) => {
                if (type === 'off') { return 'Số ngày muốn xin nghỉ (Ví dụ: 0.5, 1, 1.5, 2, 2.5,...)'; }
                if (type === 'wfh') { return 'Số ngày muốn xin WFH (Ví dụ: 0.5, 1, 1.5, 2, 2.5,...)'; }
                if (type === 'late') { return 'Xin đi muộn bao lâu - đơn vị: phút (Ví dụ: 30)'; }
                // End soon
                return 'Xin nghỉ sớm bao lâu - đơn vị: phút (Ví dụ: 30)';
            },
            reason: 'Lý do',
        },
        period: {
            day: 'Cả ngày',
            morning: 'Sáng',
            afternoon: 'Chiều',
        }
    },

    confirmRequestModal: {
        heading: 'Xác nhận',
        offOverview: ({
            user,
            type,
            startDate,
            startDay,
            startDateDayLight,
            duration,
            endDate,
            endDay,
            endDateDayLight,
        }) => `${user ? `*${user}*` : 'Bạn'} xin phép ${vi.confirmRequestModal.type[type]}${endDate ? ' từ' : ''} ${vi.confirmRequestModal.period[startDateDayLight](startDate, startDay)}${endDate && endDateDayLight ? `  đến hết ${vi.confirmRequestModal.period[endDateDayLight](endDate, endDay)}` : ''}. (*${duration}* ngày)
        `,
        lateOverview: ({
            user,
            type,
            startDate,
            startDay,
            startDateDayLight,
            duration,
        }) => `${user ? `*${user}*` : 'Bạn'} xin phép ${vi.confirmRequestModal.type[type]} khoảng *${duration} phút*, ${vi.confirmRequestModal.period[startDateDayLight](startDate, startDay)}`,

        remainingNotice: (type: string, total: number) => `Sau khi xin phép bạn còn ${type === 'off' ? `:beach: *${total}* ngày nghỉ phép` : `:house_with_garden: *${total}* ngày WFH`}.`,
        type: {
            off: 'nghỉ',
            wfh: 'WFH',
            late: 'đi muộn',
            endSoon: 'nghỉ sớm',
        },
        period: {
            day: (date: string, day: string) => `*${day}, ngày ${date}*`,
            morning: (date: string, day: string) => `sáng *${day}, ngày ${date}*`,
            afternoon: (date: string, day: string) => `chiều *${day}, ngày ${date}*`,
        },
        warningOverTotal: (type: string) => `:warning: *Số ngày ${type === 'off' ? 'nghỉ phép' : 'phép WFH'} không đủ*. Bạn có thể làm ảnh hưởng tới công việc của cả team, cũng như các đánh giá về performance cá nhân, hoặc hơn nữa là bị trừ lương.

        :x: Đồng thời bạn phải tích một tích đỏ trên bảng. (Quá số ngày phép)`,
        warningLateRequest: ':heavy_multiplication_x: Bạn xin phép muộn nên phải tích 1 tích đen trên bảng.',
        warningLateTick: ':heavy_multiplication_x: Xin đi muộn hoặc về sớm vẫn phải tích một tích đen trên bảng.',
        warningLateLimitedTick: ':heavy_multiplication_x: Bạn đã dùng hết quỹ thời gian [đi muộn/về sớm] của tháng này. Bạn phải tích một tích trên bảng.',
    },

    offLogMessage: {
        icon: {
            off: ':beach:',
            wfh: ':house_with_garden:',
            late: ':turtle:',
            endSoon: ':police_car:',
        },
        reason: '*Lý do:*',
        warningOverTotal: (total?: number) => `Quá số ngày phép${total ? ` (*${total}* ngày phép)` : ''}.`,
        warningLateTick: 'Đi muộn/Về sớm phải tích một tích trên bảng.',
        warningLateRequest: 'Xin phép muộn.',
        requestCancelled: (author: string) => `:speech_balloon: *${author}* đã hủy yêu cầu.`,
        cancelledSuccessful: 'Hủy yêu cầu thành công.',
    },

    dailyLogMessage: {
        caption: (date: string) => `Danh sách xin phép hôm nay _${date}_ :`,
        offList: (total: number) => `${vi.offLogMessage.icon.off}  *Nghỉ (${total}):*`,
        wfhList: (total: number) => `${vi.offLogMessage.icon.wfh}  *WFH (${total}):*`,
        lateEndList: () => `${vi.offLogMessage.icon.endSoon} *${vi.common.other}:*`,
        lateEndDesc: (type: string, period: string, duration: number) => `${vi.period[period]} ${vi.confirmRequestModal.type[type]} ${duration} phút`,
    },

    tickBoard: {
        heading: 'Thống kê',
        boardName: (date?: string) => `Thống kê *${date ? date : 'tháng này'}*:`,
        userLine: ({ username, off, wfh, late }: {
            username: string,
            off?: number,
            wfh?: number,
            late?: number,
        }) => `*${username}:* ${off ? `${vi.type.off} ${off} ngày` : ''}${wfh ? ` | WFH ${wfh} ngày` : ''}${late ? ` | ${vi.type.lateEnd} ${late} phút` : ''}`,
    },

    statsBoard: {
        heading: 'Thống kê',
        caption: (year?: number) => `Thống kê ngày nghỉ năm ${year ? year : 'nay'}:`,
        userLine: ({ username, off, wfh, late }: {
            username: string,
            off?: number,
            wfh?: number,
            late?: number,
        }) => `*${username}:* còn *${off}* ngày nghỉ | *${wfh}* ngày WFH | *${late}* phút muộn`,
    },

    memberLogs: {
        heading: 'Lịch sử xin phép',
        caption: (user: string, off: number, wfh: number) => `*${user}* còn :beach: *${off}* ngày nghỉ phép và :house_with_garden: *${wfh}* ngày WFH trong năm.`,
    },
};

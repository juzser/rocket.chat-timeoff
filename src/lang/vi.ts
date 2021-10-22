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
    },

    error: {
        startNotEnd: 'Bạn không thể start khi chưa kết thúc ngày làm việc trước đó bằng `end`',
        noTimelog: 'Không tìm thấy log cho ngày hôm nay.',
        alreadyStart: 'Bạn đã bắt đầu rồi hoặc chưa end lần trước.',
        alreadyEnd: 'Bạn chưa bắt đầu.',
        somethingWrong: 'Có lỗi, vui lòng thử lại.',
        wrongRoom: 'Bạn không thể check-in ở channel này',
    },

    type: {
        off: 'Nghỉ',
        late: 'Đi muộn',
        endSoon: 'Về sớm',
        wfh: 'Work from home',
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
        caption: (total: number) => `Bạn còn *${total}* ngày nghỉ phép trong năm.`,
        heading: 'Xin phép',
        fields: {
            type: 'Xin phép',
            startDate: 'Ngày',
            duration: 'Số ngày',
            reason: 'Lý do',
        },
    },
};

import { BlockBuilder } from '@rocket.chat/apps-engine/definition/uikit';
import { IScheduleLog, RequestType, TimePeriod } from '../interfaces/IRequestLog';
import { lang } from '../lang/index';

export async function dailylogBlock({ block, date, logs }: {
    block: BlockBuilder;
    date: string;
    logs: IScheduleLog[];
}): Promise<void> {

    const caption = lang.dailyLogMessage.caption(date);

    const offList: IScheduleLog[] = [];
    const wfhList: IScheduleLog[] = [];
    const lateEndList: IScheduleLog[] = [];

    logs.map((log) => {
        if (log.type === RequestType.OFF) {
            offList.push(log);
        } else if (log.type === RequestType.WFH) {
            wfhList.push(log);
        } else {
            lateEndList.push(log);
        }
    });

    // Build message
    let content = '';

    // Off
    if (offList.length > 0) {
        content += lang.dailyLogMessage.offList(offList.length);

        // Sort off list [day, morning, afternoon]
        const sortedOffList = offList.sort((a, b) => sortDayLight(a.period, b.period));

        content += sortedOffList.map((log) => {
            return `  ${log.username}${log.period === TimePeriod.DAY ? '' : ` (${lang.period[log.period]})`}`;
        }).join(',');
        content += '\n';
    }

    // WFH
    if (wfhList.length > 0) {
        content += lang.dailyLogMessage.wfhList(wfhList.length);

        // Sort wfh list [day, morning, afternoon]
        const sortedWfhList = wfhList.sort((a, b) => sortDayLight(a.period, b.period));

        content += sortedWfhList.map((log) => {
            return `  ${log.username}${log.period === TimePeriod.DAY ? '' : ` (${lang.period[log.period]})`}`;
        }).join(',');
        content += '\n';
    }

    // Late/EndSoon
    if (lateEndList.length > 0) {
        content += lang.dailyLogMessage.lateEndList();

        // Sort late/end list [morning, afternoon]
        const sortedLateEndList = lateEndList.sort((a, b) => {
            // Late vs Late
            if (a.type === RequestType.LATE && b.type === RequestType.LATE) {
                return sortDayLight(a.period, b.period);
            }

            // End vs End
            if (a.type === RequestType.END_SOON && b.type === RequestType.END_SOON) {
                return sortDayLight(a.period, b.period);
            }

            // Late vs End
            return (a.type === RequestType.LATE && b.type === RequestType.END_SOON)
                ? -1 : 1;
        });

        content += sortedLateEndList.map((log) => {
            return `  ${log.username} (${lang.dailyLogMessage.lateEndDesc(log.type, log.period, log.duration || 0)})`;
        }).join(',');
    }

    block.addSectionBlock({
        text: block.newMarkdownTextObject(caption),
    });
    block.addContextBlock({
        elements: [
            block.newMarkdownTextObject(content),
        ],
    });
}

function sortDayLight(a: TimePeriod, b: TimePeriod): number {
    if (a === TimePeriod.DAY) {
        return -1;
    }
    if (a === TimePeriod.MORNING) {
        return b === TimePeriod.DAY ? 1 : -1;
    }
    return 1;
}

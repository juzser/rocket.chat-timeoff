import { BlockBuilder, BlockElementType, ButtonStyle } from '@rocket.chat/apps-engine/definition/uikit';
import { IMemberTime, WfhStatus } from '../interfaces/ITimeLog';
import { lang } from '../lang/index';
import { getTimeHour } from '../lib/helpers';

export async function timelogBlock({ block, memberData }: {
    block: BlockBuilder,
    memberData: Array<IMemberTime>,
}): Promise<void> {
    const caption = lang.message.caption(memberData.length);

    block.addSectionBlock({
        text: block.newMarkdownTextObject(caption),
    });

    // Build member block
    let memberLogContent = '';

    memberData.forEach((member) => {
        const lastStatus = member.states[member.states.length - 1].status;
        let statusContent = '';
        let logContent = '';
        let totalTime = 0;

        if (lastStatus === WfhStatus.START) {
            statusContent = lang.common.statusStart;
        }

        if (lastStatus === WfhStatus.PAUSE) {
            statusContent = lang.common.statusPause;
        }

        if (lastStatus === WfhStatus.RESUME) {
            statusContent = lang.common.statusResume;
        }

        if (lastStatus === WfhStatus.END) {
            statusContent = lang.common.statusEnded;
        }

        member.states.forEach((state, index) => {
            const prevState = member.states[index - 1];
            if (prevState
                && (state.status === WfhStatus.PAUSE || state.status === WfhStatus.END)
                && (prevState.status === WfhStatus.START || prevState.status === WfhStatus.RESUME)) {
                    totalTime += state.timestamp - prevState.timestamp;
            }

            logContent += logContent ? ' *-* ' : '';
            logContent += `[${getTimeHour(state.timestamp)} ${capitalizeStr(state.status)}`;
            if (state.message.trim()) {
                logContent += `: _${state.message}_ `;
            }
            logContent += ']';
        });

        memberLogContent += `${statusContent} *${member.username}* -- ${lang.message.totalTime(totalTime)}\n${logContent}\n\n`;
    });


    block.addContextBlock({
        elements: [
            block.newMarkdownTextObject(memberLogContent),
        ],
    });
}

function capitalizeStr(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

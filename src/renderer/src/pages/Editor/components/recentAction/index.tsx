import React from 'react';
import { HistoryAction } from '../../hooks/types';
import styles from '../../index.module.css';

interface RecentActionsPanelProps {
    recentActions: HistoryAction[];
    onRevert: (actionId: string) => void;
    onClose: () => void;
}

export const RecentActionsPanel: React.FC<RecentActionsPanelProps> = ({
    recentActions,
    onRevert,
    onClose
}) => {

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const retrieveActionDetail = (data: HistoryAction) => {
        const textContent = data.content
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<p.*?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim();
        return textContent
    }

    return (
        <div className={styles["recent-actions-panel"]}>
            <ul className={styles["recent-actions-list"]}>
                {recentActions.map(action => (
                    <li key={action.id} className={styles["recent-action-item"]}>
                        <button
                            onClick={() => onRevert(action.id)}
                            className={styles["revert-button"]}
                            title={`Ripristina a: ${action.description}`}
                        >
                            <span className={styles["action-description"]}>{action.description}</span>
                            <span title={retrieveActionDetail(action)} className={styles["action-detail"]}>{retrieveActionDetail(action)}</span>
                            <span className={styles["action-time"]}>{formatTime(action.timestamp)}</span>
                        </button>
                    </li>
                ))}
                <li key={'cancel'} className={styles["recent-action-item"]}>
                    <button
                        onClick={() => onClose()}
                        className={styles["revert-button"]}
                        title={`cancel`}
                    >
                        <span className={styles["action-detail"]}>{'Cancel'}</span>
                    </button>
                </li>
            </ul>
        </div>
    );
};
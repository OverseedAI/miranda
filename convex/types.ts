export enum ArticleStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export enum ScanStatus {
    INITIALIZING = 'initializing',
    RUNNING = 'running',
    COMPLETED = 'completed',
}

export enum ScanQueueStatus {
    AWAITING = 'awaiting',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
}

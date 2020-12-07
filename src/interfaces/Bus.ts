import { EncodedStoredMessage, StoredMessage } from "../Message";

export interface BusPublisher {
    publish(message: StoredMessage): Promise<void>;
};

export interface Acknowledge {
    action: "acknowledge";
};

export interface Reject {
    action: "reject";
};

export interface Retry {
    action: "retry";
};

export type ProcessingOutcome = Acknowledge | Reject | Retry;

export interface SubscriberFunction {
    (message: StoredMessage): Promise<ProcessingOutcome>;
};

export interface BusSuscriber {
    subscribe(processor: SubscriberFunction): Promise<void>;
};

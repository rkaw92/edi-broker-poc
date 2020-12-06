import { Readable, Writable } from "stream";

export interface HeaderTuple {
    name: string;
    value: string;
}

export interface Message<BodyType extends object> {
    method: string;
    path: string;
    headers: HeaderTuple[];
    body: BodyType;
};

export type InboundMessage = Message<Readable>;
export type OutboundMessage = Message<Writable>;
export type StoredMessage = Message<Buffer>;
export type EncodedStoredMessage = Omit<StoredMessage,"body"> & {
    body: string;
};

export function isInboundMessage(message: Message<any>): message is InboundMessage {
    return (typeof message.body === 'object' && typeof message.body.read === 'function');
};

export function isOutboundMessage(message: Message<any>): message is OutboundMessage {
    return (typeof message.body === 'object' && typeof message.body.write === 'function');
};

export function isStoredMessage(message: Message<any>): message is StoredMessage {
    return (typeof message.body === 'object' && Buffer.isBuffer(message.body));
};

export function encode(message: StoredMessage): EncodedStoredMessage {
    return {
        method: message.method,
        path: message.path,
        headers: message.headers,
        body: message.body.toString('base64')
    };
};

export function decode(message: EncodedStoredMessage): StoredMessage {
    return {
        method: message.method,
        path: message.path,
        headers: message.headers,
        body: Buffer.from(message.body, 'base64')
    };
};

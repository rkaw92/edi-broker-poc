import { IncomingMessage, request } from "http";
import urlJoin from "url-join";
import { HeaderTuple, InboundMessage, isInboundMessage, isStoredMessage, StoredMessage } from "./Message";
import concat from 'concat-stream';

const BR = '\r\n';

function requestHeadersToTuples(rawHeaders: IncomingMessage['rawHeaders'], headersToSkip: Set<string> = new Set()): HeaderTuple[] {
    const tuples = [];
    for (let i = 0; i < rawHeaders.length; i += 2) {
        if (!headersToSkip.has(rawHeaders[i].toLowerCase())) {
            tuples.push({ name: rawHeaders[i], value: rawHeaders[i+1] || '' });
        }
    }
    return tuples;
};

function tuplesToRequestHeaders(tuples: HeaderTuple[]): IncomingMessage['rawHeaders'] {
    const output = new Array<string>(tuples.length * 2);
    let index = 0;
    for (let { name, value } of tuples) {
        output[index] = name;
        output[index + 1] = value;
        index += 2;
    }
    return output;
}

function getHeaderValueSeparator(headerName: string) {
    switch (headerName.toLowerCase()) {
        case 'cookie':
            return ';';
        default:
            return ',';
    }
}

export function headerTuplesToObject(tuples: HeaderTuple[]) {
    const output = Object.create(null);
    for (let { name, value } of tuples) {
        if (output[name]) {
            output[name] += getHeaderValueSeparator(name) + value;
        } else {
            output[name] = value;
        }
    }
    return output;
};

export function reconstructRequest(req: IncomingMessage) {
    const methodLine = `${req.method} ${req.url} HTTP/${req.httpVersion}`;
    const tuples = requestHeadersToTuples(req.rawHeaders);
    return methodLine + BR + tuples.map(({ name, value }) => `${name}: ${value}`).join(BR) + BR + BR;
};

export function requestToMessage(req: IncomingMessage): InboundMessage {
    const headersToSkip = new Set([ 'host' ]);
    return {
        method: req.method!,
        path: req.url!,
        headers: requestHeadersToTuples(req.rawHeaders, headersToSkip),
        body: req
    };
};

export async function toStorage(message: InboundMessage): Promise<StoredMessage> {
    const body = await new Promise<Buffer>(function(resolve, reject) {
        message.body.pipe(concat(resolve));
        message.body.on('error', reject);
    });
    return {
        method: message.method,
        path: message.path,
        headers: message.headers,
        body: body
    };
};

export function proxyMessage(message: InboundMessage | StoredMessage, baseURL: string) {
    const finalHeaders = message.headers.slice();
    finalHeaders.unshift({ name: 'Host', value: (new URL(baseURL)).host });
    const rawHeaders = tuplesToRequestHeaders(finalHeaders);
    // TODO: Add processing of X-EDI-Target-Path
    // TODO: Add stripping of X-EDI-Target-* headers
    const req = request(urlJoin(baseURL, message.path), {
        headers: rawHeaders as any,
        method: message.method
    });
    if (isInboundMessage(message)) {
        message.body.pipe(req);
    } else if (isStoredMessage(message)) {
        req.end(message.body);
    }
    return req;
};

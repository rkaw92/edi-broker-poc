import * as http from 'http';
import { proxyMessage, requestToMessage, toStorage } from './httpUtils';
import * as Pulsar from 'pulsar-client';
import { encode } from './Message';

const client = new Pulsar.Client({
    serviceUrl: 'pulsar://localhost',
    operationTimeoutSeconds: 30
});
const producer = client.createProducer({
    topic: 'persistent://learn/test/poc',
    sendTimeoutMs: 30000
});

const server = http.createServer(async function(req, res) {
    const inboundMessage = requestToMessage(req);
    const messageToPublish = encode(await toStorage(inboundMessage));
    (await producer).send({
        data: Buffer.from(JSON.stringify(messageToPublish), 'utf-8')
    });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ accepted: true }));
});

server.listen(5058);
server.on('listening', function() {
    console.error('Server listening');
});
server.on('error', function(error) {
    console.error('Error:', error);
    process.exit(1);
});

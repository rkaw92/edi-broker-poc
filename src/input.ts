import * as http from 'http';
import { proxyMessage, requestToMessage, toStorage } from './httpUtils';
import { encode } from './Message';
import { getPublisher } from './infrastructure/Pulsar';

(async function() {
    const publisher = await getPublisher({
        client: {
            serviceUrl: 'pulsar://localhost',
            operationTimeoutSeconds: 30
        },
        producer: {
            topic: 'persistent://learn/test/poc',
            sendTimeoutMs: 30000
        }
    });
    const server = http.createServer(async function(req, res) {
        const inboundMessage = requestToMessage(req);
        const messageToPublish = await toStorage(inboundMessage);
        publisher.publish(messageToPublish);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ accepted: true }));
    });
    
    server.listen(5058);
    server.on('listening', function() {
        console.error('Input component listening');
    });
    server.on('error', function(error) {
        console.error('Error:', error);
        process.exit(1);
    });    
})();

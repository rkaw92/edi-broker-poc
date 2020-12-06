import * as Pulsar from 'pulsar-client';
import { proxyMessage } from './httpUtils';
import { decode } from './Message';

const client = new Pulsar.Client({
    serviceUrl: 'pulsar://localhost',
    operationTimeoutSeconds: 30
    // TODO: Fix @types/pulsar-client to include the "log" property; silence the output.
});
(async function() {
    const consumer = await client.subscribe({
        topic: 'persistent://learn/test/poc',
        subscription: 'output',
        subscriptionType: 'Shared'
    });
    while (true) {
        const payload = await consumer.receive();
        const messageJSON = JSON.parse(payload.getData().toString('utf-8'));
        const message = decode(messageJSON);
        const targetRequest = proxyMessage(message, 'http://localhost:5059');
        targetRequest.on('response', function(targetResponse) {
            console.error('Target response code: %s', targetResponse.statusCode);
        });
        targetRequest.on('error', function(error) {
            console.error('Failed to relay request to target:', error);
        });
        consumer.acknowledge(payload);
    }
})();

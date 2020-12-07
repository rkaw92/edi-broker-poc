import { proxyMessage } from './httpUtils';
import { getSubscriber } from './infrastructure/Pulsar';
import { ProcessingOutcome } from './interfaces/Bus';
import { decode } from './Message';


(async function() {
    const subscriber = await getSubscriber({
        client: {
            serviceUrl: 'pulsar://localhost',
            operationTimeoutSeconds: 30
            // TODO: Fix @types/pulsar-client to include the "log" property; silence the output.
        },
        subscriber: <any>{
            topic: 'persistent://learn/test/poc',
            subscription: 'output',
            subscriptionType: 'Shared',
            // TODO: Add this to @types/pulsar-client so that we can get rid of the type coercion above.
            nAckRedeliverTimeoutMs: 5000
        }
    });
    await subscriber.subscribe(function(message) {
        const targetRequest = proxyMessage(message, 'http://localhost:5059');
        return new Promise<ProcessingOutcome>(function(resolve) {
            targetRequest.on('response', function(targetResponse) {
                console.error('Target response code: %s', targetResponse.statusCode);
                if (targetResponse.statusCode! >= 200 && targetResponse.statusCode! < 300) {
                    resolve({ action: 'acknowledge' });
                } else {
                    resolve({ action: 'retry' });
                }
            });
            targetRequest.on('error', function(error) {
                console.error('Failed to relay request to target, will retry:', error);
                resolve({ action: 'retry' });
            });
        });
    });
})();

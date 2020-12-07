import * as Pulsar from "pulsar-client";
import { BusPublisher, BusSuscriber, ProcessingOutcome, SubscriberFunction } from "../interfaces/Bus";
import { decode, encode, StoredMessage } from "../Message";

export class PulsarPublisher implements BusPublisher {
    private producer: Pulsar.Producer;
    constructor(producer: Pulsar.Producer) {
        this.producer = producer;
    }

    async publish(message: StoredMessage): Promise<void> {
        const data = Buffer.from(JSON.stringify(encode(message)), 'utf-8');
        await this.producer.send({ data });
    }
}

export class PulsarSubscriber implements BusSuscriber {
    private consumer: Pulsar.Consumer;
    constructor(consumer: Pulsar.Consumer) {
        this.consumer = consumer;
    }

    async subscribe(processor: SubscriberFunction) {
        while (true) {
            const rawMessage = await this.consumer.receive();
            const messageJSON = JSON.parse(rawMessage.getData().toString('utf-8'));
            const message = decode(messageJSON);
            let outcome: ProcessingOutcome;
            try {
                outcome = await processor(message);
            } catch (error) {
                outcome = { action: 'retry' };
            }
            switch (outcome.action) {
                case 'acknowledge':
                    this.consumer.acknowledge(rawMessage);
                    break;
                case 'reject':
                case 'retry':
                    this.consumer.negativeAcknowledge(rawMessage);
                    break;
                default:
                    // TODO: Emit an error, log a warning, or crash on an obvious bug?
                    this.consumer.negativeAcknowledge(rawMessage);
            }
            
        }
    }
}

export async function getPublisher(options: {
    client: Pulsar.ClientOpts,
    producer: Pulsar.ProducerOpts
}): Promise<BusPublisher> {
    const client = new Pulsar.Client(options.client);
    const producer = await client.createProducer(options.producer);
    return new PulsarPublisher(producer);
};

export async function getSubscriber(options: {
    client: Pulsar.ClientOpts,
    subscriber: Pulsar.SubscribeOpts
}) {
    const client = new Pulsar.Client(options.client);
    const consumer = await client.subscribe(options.subscriber);
    return new PulsarSubscriber(consumer);
};

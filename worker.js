import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { clients } from "./index.js";

const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.ENDPOINT ?? "http://host.docker.internal:4566",
    credentials: {
        accessKeyId: "test",
        secretAccessKey: "test"
    }
})

const queueUrl = process.env.SQS_QUEUE_URL

export const consumerSQS = async () => {
    while(true) {
        try {
            const response = await sqsClient.send(
                new ReceiveMessageCommand({
                    QueueUrl: queueUrl,
                    MaxNumberOfMessages: 10,
                    VisibilityTimeout: 60,
                    WaitTimeSeconds: 20
                })
            )

            const messages = response.Messages || [];

            for (const message of messages) {
                if (!message.Body) continue


                const payload = JSON.parse(message.Body)

                if (payload.Type === 'Notification') {
                    // Parce da mensagem do SNS

                    const body = JSON.parse(payload.Message)

                    console.log(
                      `[INSTANCE ${process.env.HOSTNAME}] Notification received:`,
                      body,
                    )
                
                    const { orderId, userId, status } = body
                
                    const userConnections = clients.get(String(userId)) || []
                
                    userConnections.forEach((connection) => {
                      connection.write(
                        `data: ${JSON.stringify({ orderId, status, instance: process.env.HOSTNAME })}\n\n`,
                      )
                    })
                    processedSuccessfully = true
                  }
                
                if (message.ReceiptHandle) {
                    await sqsClient.send(
                        new DeleteMessageCommand({
                            QueueUrl: queueUrl,
                            ReceiptHandle: message.ReceiptHandle
                        })
                    )
                }
            }

        } catch (error) {
            console.error('Erro ao consumir SQS:', error);
            await new Promise((r) => setTimeout(r, 5000));
        }
    }
}
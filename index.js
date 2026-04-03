import fastify from 'fastify'
import cors from '@fastify/cors'

const app = fastify()

const PORT = process.env.PORT || 3000
const FRONTENDURL = process.env.ALB_DNS_NAME || 'localhost'
const origin = `http://${FRONTENDURL}:${PORT}`

app.register(cors, {
  origin: [origin],
  methods: ['GET', 'POST'],
})

const clients = new Map()

app.get('/health', (_request, reply) => {
  console.log('health endpoint called')
  return reply.status(200).send({
    instance: process.env.HOSTNAME,
    status: 'ok',
  })
})

app.post('/webhook', async (req, reply) => {
  const body = JSON.parse(req.body)

  if (body.Type === 'SubscriptionConfirmation' && body.SubscribeURL) {
    try {
      console.log(
        `[INSTANCE ${process.env.HOSTNAME}] Confirming subscription... URL:`,
        body.SubscribeURL,
      )

      const response = await fetch(body.SubscribeURL, {
        method: 'GET',
      })

      const data = await response.text()

      console.log(
        `[INSTANCE ${process.env.HOSTNAME}] Subscription confirmation data:`,
        data,
      )

      console.log(
        `[INSTANCE ${process.env.HOSTNAME}] Subscription confirmation received`,
      )

      return reply.status(200).send({
        ok: 'true',
      })
    } catch (error) {
      console.error('Error confirming subscription:', error)

      return reply.status(500).send({ error: 'Failed to confirm subscription' })
    }
  }

  if (body.Type === 'Notification') {
    const message = JSON.parse(body.Message)

    console.log(
      `[INSTANCE ${process.env.HOSTNAME}] Notification received:`,
      message,
    )

    const { orderId, userId, status } = message

    const userConnections = clients.get(String(userId)) || []

    userConnections.forEach((connection) => {
      connection.write(
        `data: ${JSON.stringify({ orderId, status, instance: process.env.HOSTNAME })}\n\n`,
      )
    })

    return reply.status(200).send({
      ok: 'true',
    })
  }
})

const headBeat = (userId) => {
  const connection = clients.get(userId)
  if (connection) {
    setInterval(() => {
      connection.forEach((res) => {
        res.write(`data: ${JSON.stringify('heartbeat')}\n\n`)
      })
    }, 30000)
  }
}

app.get('/events/:userId', (request, reply) => {
  console.log(`[INSTANCE ${process.env.HOSTNAME}] client connected`)
  const { userId } = request.params

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-control': 'no-cache',
    connection: 'keep-alive',
    'access-control-allow-origin': origin,
  })

  if (!clients.has(userId)) {
    clients.set(userId, new Set())
  }

  clients.get(userId).add(reply.raw)

  headBeat(userId)

  request.raw.on('close', () => {
    const connection = clients.get(userId)
    if (connection) {
      console.log(
        `[INSTANCE ${process.env.HOSTNAME}] client: ${userId} disconnected`,
      )
      connection.delete(reply.raw)
      if (connection.size === 0) {
        clients.delete(userId)
      }
    }
  })
})

app.listen(
  {
    port: PORT,
  },
  () => {
    console.log(
      `[INSTANCE ${process.env.HOSTNAME}] Server is running on port ${PORT}`,
    )
  },
)

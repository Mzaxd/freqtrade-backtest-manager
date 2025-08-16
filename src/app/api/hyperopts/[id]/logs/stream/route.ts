import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import Redis from 'ioredis'
import { readFile } from 'fs/promises'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const hyperoptId = params.id

  try {
    // Check if hyperopt task exists
    const hyperopt = await prisma.hyperoptTask.findUnique({
      where: { id: hyperoptId },
    })

    if (!hyperopt) {
      return new Response('Hyperopt task not found', { status: 404 })
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const channel = `hyperopt-logs:${hyperoptId}`
        
        // Subscribe to Redis channel
        const subscriber = redis.duplicate()
        
        subscriber.subscribe(channel, (err, count) => {
          if (err) {
            console.error('Failed to subscribe to Redis channel:', err)
            controller.error(err)
            return
          }
          console.log(`Subscribed to ${channel} channel`)
        })

        // Handle incoming messages
        subscriber.on('message', (chan, message) => {
          if (chan === channel) {
            try {
              // Send the log as a Server-Sent Event
              const data = `data: ${JSON.stringify({ log: message, timestamp: new Date().toISOString() })}\n\n`
              controller.enqueue(new TextEncoder().encode(data))
            } catch (error) {
              console.error('Error processing Redis message:', error)
            }
          }
        })

        // Handle connection close
        request.signal.addEventListener('abort', () => {
          console.log('Client disconnected, cleaning up Redis subscription')
          subscriber.unsubscribe(channel)
          subscriber.quit()
          controller.close()
        })

      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    })
  } catch (error) {
    console.error('Error setting up hyperopt log stream:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
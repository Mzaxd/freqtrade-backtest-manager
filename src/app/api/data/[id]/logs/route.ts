import { NextRequest, NextResponse } from 'next/server'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      start(controller) {
        const subscriber = redis.duplicate()
        const channel = `logs:${params.id}`
        
        subscriber.subscribe(channel, (err) => {
          if (err) {
            console.error('Failed to subscribe:', err)
            controller.close()
            return
          }
        })
        
        subscriber.on('message', (channel, message) => {
          const data = `data: ${JSON.stringify({ log: message })}\n\n`
          controller.enqueue(encoder.encode(data))
        })
        
        request.signal.addEventListener('abort', () => {
          subscriber.unsubscribe(channel)
          subscriber.disconnect()
          controller.close()
        })
      },
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to stream logs' },
      { status: 500 }
    )
  }
}
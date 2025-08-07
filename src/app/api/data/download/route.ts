import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { dataDownloadQueue } from '@/lib/queue'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { exchange, pairs: pairsInput, timeframes, marketType, timerangeStart, timerangeEnd } = body

    const pairs = typeof pairsInput === 'string'
      ? pairsInput.split(',').map(p => p.trim()).filter(p => p)
      : pairsInput;

    if (!exchange || !pairs || !timeframes) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return NextResponse.json({ error: 'Pairs must be a non-empty array' }, { status: 400 })
    }

    if (!Array.isArray(timeframes) || timeframes.length === 0) {
      return NextResponse.json({ error: 'Timeframes must be a non-empty array' }, { status: 400 })
    }

    const job = await prisma.dataDownloadJob.create({
      data: {
        exchange,
        pairs,
        timeframes,
        marketType: marketType || 'spot',
        timerangeStart: timerangeStart ? new Date(timerangeStart) : null,
        timerangeEnd: timerangeEnd ? new Date(timerangeEnd) : null,
        status: 'PENDING',
      },
    })

    await dataDownloadQueue.add('dataDownload', { jobId: job.id })

    return NextResponse.json(job)
  } catch (error) {
    console.error('Failed to create download job:', error)
    return NextResponse.json({ error: 'Failed to create download job' }, { status: 500 })
  }
}
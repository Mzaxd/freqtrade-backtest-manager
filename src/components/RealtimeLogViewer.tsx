'use client'

import { useEffect, useState, useRef } from 'react'

interface RealtimeLogViewerProps {
  logSourceUrl: string
  initialLogs?: string
}

const RealtimeLogViewer = ({ logSourceUrl, initialLogs }: RealtimeLogViewerProps) => {
  const [logs, setLogs] = useState<string[]>(initialLogs ? initialLogs.split('\n') : [])
  const logsEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const eventSource = new EventSource(logSourceUrl)
    setLogs(initialLogs ? initialLogs.split('\n') : [])

    eventSource.onmessage = (event) => {
      const parsedData = JSON.parse(event.data)
      setLogs((prevLogs) => [...prevLogs, parsedData.log])
    }

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [logSourceUrl, initialLogs])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const highlightCommand = (log: string) => {
    const commandRegex = /(freqtrade\s+\w+-\w+)/g
    return log.replace(commandRegex, '<span class="text-purple-500 font-bold">$1</span>')
  }

  return (
    <pre className="bg-gray-900 text-white p-4 rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap break-all">
      {logs.map((log, index) => (
        <div key={index} dangerouslySetInnerHTML={{ __html: highlightCommand(log) }} />
      ))}
      <div ref={logsEndRef} />
    </pre>
  )
}

export default RealtimeLogViewer
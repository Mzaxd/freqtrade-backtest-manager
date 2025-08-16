'use client'

import { useEffect, useState, useRef } from 'react'

interface RealtimeLogViewerProps {
  logSourceUrl: string
  initialLogs?: string
  clearCache?: boolean
}

const RealtimeLogViewer = ({ logSourceUrl, initialLogs, clearCache }: RealtimeLogViewerProps) => {
  const [logs, setLogs] = useState<string[]>([])
  const logsEndRef = useRef<HTMLDivElement | null>(null)
  const storageKey = useRef(`logs-${logSourceUrl.split('/').pop()}`)

  useEffect(() => {
    // Clear cache if requested
    if (clearCache) {
      localStorage.removeItem(storageKey.current)
      setLogs(initialLogs ? initialLogs.split('\n') : [])
      return
    }

    // Try to load cached logs from localStorage first
    const cachedLogs = localStorage.getItem(storageKey.current)
    if (cachedLogs) {
      try {
        const parsedLogs = JSON.parse(cachedLogs)
        setLogs(parsedLogs)
      } catch (error) {
        console.error('Failed to parse cached logs:', error)
        // If parsing fails, clear the corrupted cache
        localStorage.removeItem(storageKey.current)
        if (initialLogs) {
          const initialLogLines = initialLogs.split('\n')
          setLogs(initialLogLines)
          localStorage.setItem(storageKey.current, JSON.stringify(initialLogLines))
        }
      }
    } else if (initialLogs) {
      // If no cached logs, use initialLogs
      const initialLogLines = initialLogs.split('\n')
      setLogs(initialLogLines)
      localStorage.setItem(storageKey.current, JSON.stringify(initialLogLines))
    }
    
    const eventSource = new EventSource(logSourceUrl)

    eventSource.onmessage = (event) => {
      const parsedData = JSON.parse(event.data)
      setLogs((prevLogs) => {
        const newLogs = [...prevLogs, parsedData.log]
        // Cache logs in localStorage
        localStorage.setItem(storageKey.current, JSON.stringify(newLogs))
        return newLogs
      })
    }

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [logSourceUrl, initialLogs, clearCache])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const highlightCommand = (log: string) => {
    const commandRegex = /(freqtrade\s+\w+-\w+)/g
    return log.replace(commandRegex, '<span class="text-purple-500 font-bold">$1</span>')
  }

  return (
    <pre className="bg-gray-900 text-white p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap break-all h-full">
      {logs.map((log, index) => (
        <div key={index} dangerouslySetInnerHTML={{ __html: highlightCommand(log) }} />
      ))}
      <div ref={logsEndRef} />
    </pre>
  )
}

export default RealtimeLogViewer
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export function RouteLoadingIndicator() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [previousPath, setPreviousPath] = useState(pathname)

  useEffect(() => {
    if (pathname !== previousPath) {
      setIsLoading(true)
      const timer = setTimeout(() => {
        setIsLoading(false)
        setPreviousPath(pathname)
      }, 300) // 最小显示时间，避免闪烁

      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams, previousPath])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    </div>
  )
}
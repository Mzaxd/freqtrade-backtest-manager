'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()

  const onSelectChange = (newLocale: string) => {
    // pathname will be /en/dashboard, we need to remove the /en part
    const newPath = `/${newLocale}${pathname.substring(3)}`
    router.replace(newPath)
  }

  return (
    <Select value={locale} onValueChange={onSelectChange}>
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="zh">简体中文</SelectItem>
      </SelectContent>
    </Select>
  )
}
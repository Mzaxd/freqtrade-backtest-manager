'use client'

import { usePathname, useRouter } from '@/navigation'
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
    router.replace(pathname, {locale: newLocale});
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
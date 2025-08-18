'use client'

import React from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from './ui/form'

interface AutocompleteProps {
    form: UseFormReturn<any>
    name: string
    label: string
    description?: string
    fetchUrl: string
}

const Autocomplete: React.FC<AutocompleteProps> = ({ form, name, label, description, fetchUrl }) => {
    const [open, setOpen] = React.useState(false)
    const [options, setOptions] = React.useState<{ label: string; value: string }[]>([])
    const t = useTranslations('Autocomplete')

    React.useEffect(() => {
        const fetchOptions = async () => {
            try {
                const response = await fetch(fetchUrl)
                const data = await response.json()
                const formattedOptions = data.map((item: any) => ({ label: item.name, value: item.name }))
                setOptions(formattedOptions)
            } catch (error) {
                console.error('Failed to fetch autocomplete options:', error)
            }
        }
        fetchOptions()
    }, [fetchUrl])

    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>{label}</FormLabel>
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                        'w-full justify-between',
                                        !field.value && 'text-muted-foreground'
                                    )}
                                >
                                    {field.value
                                        ? options.find(
                                            (option) => option.value === field.value
                                        )?.label
                                        : t('selectOption')}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                            <Command>
                                <CommandInput placeholder={t('searchPlaceholder')} />
                                <CommandList>
                                <CommandEmpty>{t('noResultsFound')}</CommandEmpty>
                                <CommandGroup>
                                    {options.map((option) => (
                                        <CommandItem
                                            value={option.label}
                                            key={option.value}
                                            onSelect={() => {
                                                form.setValue(name, option.value)
                                                setOpen(false)
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    'mr-2 h-4 w-4',
                                                    option.value === field.value
                                                        ? 'opacity-100'
                                                        : 'opacity-0'
                                                )}
                                            />
                                            {option.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    {description && <FormDescription>{description}</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}
        />
    )
}

export default Autocomplete
import ConfigEditor from '@/components/ConfigEditor'

export default function NewConfigPage() {
  return (
    <div className="w-full">
      <ConfigEditor isNew={true} />
    </div>
  )
}
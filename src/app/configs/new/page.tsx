import NewConfigForm from '@/components/NewConfigForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function NewConfigPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">创建新配置</CardTitle>
            <CardDescription>
              创建一个新的 Freqtrade 配置集。请填写以下字段，带星号的为必填项。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NewConfigForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
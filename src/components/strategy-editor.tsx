'use client'

import React, { useState } from 'react'
import Editor from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Save, X } from 'lucide-react'

interface StrategyEditorProps {
  strategy: {
    id: number
    filename: string
    className: string
    description?: string
  } | null
  isOpen: boolean
  onClose: () => void
  onSave: (content: string) => Promise<void>
  onCreate?: (filename: string, content: string) => Promise<void>
  mode?: 'edit' | 'create'
}

export default function StrategyEditor({ strategy, isOpen, onClose, onSave, onCreate, mode = 'edit' }: StrategyEditorProps) {
  const [code, setCode] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [filename, setFilename] = useState('')
  const [className, setClassName] = useState('')
  const [description, setDescription] = useState('')

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      setCode('')
      setFilename('')
      setClassName('')
      setDescription('')
    }
  }

  const handleEditorDidMount = () => {
    if (strategy && isOpen) {
      loadStrategyContent()
    }
  }

  const loadStrategyContent = async () => {
    if (!strategy) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/strategies/${strategy.id}/content`)
      if (response.ok) {
        const data = await response.json()
        setCode(data.content || '')
      }
    } catch (error) {
      console.error('Failed to load strategy content:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (mode === 'create') {
      if (!filename || !code) return
      
      setIsSaving(true)
      try {
        if (onCreate) {
          await onCreate(filename, code)
        }
        onClose()
      } catch (error) {
        console.error('Failed to create strategy:', error)
      } finally {
        setIsSaving(false)
      }
    } else {
      if (!strategy) return
      
      setIsSaving(true)
      try {
        await onSave(code)
        onClose()
      } catch (error) {
        console.error('Failed to save strategy:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  React.useEffect(() => {
    if (strategy && isOpen && mode === 'edit') {
      loadStrategyContent()
    } else if (mode === 'create' && isOpen) {
      setCode('# Freqtrade Strategy Template\n\nfrom freqtrade.strategy import IStrategy\nfrom pandas import DataFrame\nimport talib.abstract as ta\nfrom datetime import datetime, timezone\nfrom freqtrade.persistence import Trade\n\n\nclass MyStrategy(IStrategy):\n    \"\"\"\n    This is a sample strategy template.\n    \"\"\"\n    \n    # Minimal ROI designed for the strategy\n    minimal_roi = {\n        \"40\": 0.0,\n        \"30\": 0.01,\n        \"20\": 0.02,\n        \"0\": 0.04\n    }\n    \n    # Optimal stoploss designed for the strategy\n    stoploss = -0.10\n    \n    # Optimal timeframe for the strategy\n    timeframe = \"5m\"\n    \n    def populate_indicators(self, dataframe: DataFrame, metadata: dict) -> DataFrame:\n        \"\"\"\n        Add indicators to the dataframe\n        \"\"\"\n        return dataframe\n    \n    def populate_buy_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:\n        \"\"\"\n        Based on TA indicators, populates the buy signal for the given dataframe\n        \"\"\"\n        return dataframe\n    \n    def populate_sell_trend(self, dataframe: DataFrame, metadata: dict) -> DataFrame:\n        \"\"\"\n        Based on TA indicators, populates the sell signal for the given dataframe\n        \"\"\"\n        return dataframe\n')
      setFilename('my_strategy.py')
      setClassName('MyStrategy')
      setDescription('My custom strategy')
    } else {
      setCode('')
      setFilename('')
      setClassName('')
      setDescription('')
    }
  }, [strategy, isOpen, mode])

  if (mode === 'create') {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="h-[90vh] flex flex-col p-0 sm:max-w-[80vw]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <span>创建新策略</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-6 py-4 border-b space-y-4">
            <div>
              <label className="text-sm font-medium">文件名</label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="my_strategy.py"
              />
            </div>
            <div>
              <label className="text-sm font-medium">类名</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="MyStrategy"
              />
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Strategy description"
              />
            </div>
          </div>
          
          <div className="flex-1 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
            
            <Editor
              height="100%"
              language="python"
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                folding: true,
                showFoldingControls: 'always',
              }}
            />
          </div>
          
          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !filename || !code}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  if (!strategy) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[90vh] flex flex-col p-0 sm:max-w-[80vw]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <span>编辑策略: {strategy.className}</span>
            <span className="text-sm text-muted-foreground">({strategy.filename})</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          
          <Editor
            height="100%"
            language="python"
            value={code}
            onChange={(value) => setCode(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              folding: true,
              showFoldingControls: 'always',
            }}
            onMount={handleEditorDidMount}
          />
        </div>
        
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            取消
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
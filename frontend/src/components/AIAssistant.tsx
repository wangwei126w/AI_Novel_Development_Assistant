import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, Send, Loader2, BookOpen, RefreshCw, Wand2, MessageSquare, FileText, Copy, Check } from 'lucide-react'
import { Project, Chapter, WriteMode } from '../types'

interface AIAssistantProps {
  project: Project
  activeChapter: Chapter | undefined
  onAIWrite: (mode: WriteMode, prompt?: string, style?: string) => Promise<string | null>
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  displayContent: string
  mode?: WriteMode
  isTyping?: boolean
}

export default function AIAssistant({ project, activeChapter, onAIWrite }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedMode, setSelectedMode] = useState<WriteMode>('continue')
  const [loading, setLoading] = useState(false)
  const [style, setStyle] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingRef = useRef<NodeJS.Timeout | null>(null)

  const modes: { id: WriteMode; label: string; icon: any; description: string }[] = [
    { id: 'continue', label: '续写', icon: BookOpen, description: '根据上下文继续创作' },
    { id: 'rewrite', label: '润色', icon: RefreshCw, description: '改写或提升文笔' },
    { id: 'dialogue', label: '对话', icon: MessageSquare, description: '生成角色对话' },
    { id: 'outline', label: '大纲', icon: FileText, description: '生成情节大纲' },
    { id: 'custom', label: '自定义', icon: Wand2, description: '输入自定义指令' },
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 打字机效果
  const typeMessage = useCallback((messageId: string, fullContent: string) => {
    let index = 0
    const speed = 30 // 每个字间隔30ms

    const type = () => {
      if (index < fullContent.length) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, displayContent: fullContent.slice(0, index + 1) }
            : msg
        ))
        index++
        typingRef.current = setTimeout(type, speed)
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, isTyping: false, displayContent: fullContent }
            : msg
        ))
      }
    }

    type()
  }, [])

  const handleSubmit = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      displayContent: input,
      mode: selectedMode,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const content = await onAIWrite(selectedMode, input, style || undefined)
      
      if (content) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: content,
          displayContent: '',
          mode: selectedMode,
          isTyping: true,
        }
        setMessages(prev => [...prev, assistantMessage])
        
        // 开始打字机效果
        setTimeout(() => {
          typeMessage(assistantMessage.id, content)
        }, 100)
      }
    } catch (e) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，生成内容时出错了，请重试。',
        displayContent: '抱歉，生成内容时出错了，请重试。',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const copyToClipboard = async (text: string, messageId: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(messageId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const insertToEditor = (content: string) => {
    const event = new CustomEvent('insertContent', {
      detail: { content }
    })
    window.dispatchEvent(event)
  }

  return (
    <div className="h-full flex flex-col">
      {/* 模式选择 */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-600">写作模式：</span>
          <div className="flex gap-1">
            {modes.map(mode => {
              const Icon = mode.icon
              return (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedMode === mode.id
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  title={mode.description}
                >
                  <Icon className="w-4 h-4" />
                  {mode.label}
                </button>
              )
            })}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">风格：</span>
          <input
            type="text"
            value={style}
            onChange={e => setStyle(e.target.value)}
            className="input-field text-sm py-1 w-64"
            placeholder="如：古风、悬疑、轻松幽默..."
          />
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
        {!activeChapter && (
          <div className="text-center py-12 text-amber-600 bg-amber-50 rounded-xl border border-amber-200 mx-4">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-amber-500" />
            </div>
            <p className="mb-2 font-medium text-lg">请先选择一个章节</p>
            <p className="text-sm text-amber-700">点击左侧章节列表中的章节，或创建新章节</p>
            <p className="text-xs mt-2 text-amber-500">AI 需要知道为哪个章节生成内容</p>
          </div>
        )}
        {messages.length === 0 && activeChapter && (
          <div className="text-center py-12 text-gray-400">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-indigo-300" />
            </div>
            <p className="mb-2 font-medium">AI 写作助手已就绪</p>
            <p className="text-sm">选择写作模式，输入你的需求</p>
            <p className="text-xs mt-2 text-gray-300">AI 会自动参考角色设定、世界观和前文摘要</p>
          </div>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-xl px-4 py-3 shadow-sm ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-100'
              }`}
            >
              {message.mode && message.role === 'user' && (
                <span className="text-xs opacity-75 mb-1 block">
                  {modes.find(m => m.id === message.mode)?.label}
                </span>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.displayContent}
                {message.isTyping && (
                  <span className="inline-block w-2 h-4 bg-indigo-400 ml-0.5 animate-pulse" />
                )}
              </div>
              {message.role === 'assistant' && !message.isTyping && (
                <div className="mt-3 flex gap-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    {copiedId === message.id ? (
                      <>
                        <Check className="w-3 h-3" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        复制
                      </>
                    )}
                  </button>
                  {activeChapter && (
                    <button
                      onClick={() => insertToEditor(message.content)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      插入编辑器
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="bg-white border-t border-gray-100 px-4 py-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!activeChapter}
            className="flex-1 input-field resize-none h-20 disabled:bg-gray-100 disabled:text-gray-400"
            placeholder={
              !activeChapter ? '请先选择或创建一个章节...' :
              selectedMode === 'continue' ? '输入续写要求，或直接发送让 AI 自动续写...' :
              selectedMode === 'rewrite' ? '描述你想要如何改写这段内容...' :
              selectedMode === 'dialogue' ? '描述对话场景和参与角色...' :
              selectedMode === 'outline' ? '描述你想要的情节发展方向...' :
              '输入你的自定义指令...'
            }
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim() || !activeChapter}
            className="btn-primary flex items-center gap-2 self-end disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            发送
          </button>
        </div>
      </div>
    </div>
  )
}

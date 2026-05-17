import { useState, useEffect, useRef, useCallback } from 'react'
import { Save, Type, AlignLeft, Hash, RotateCcw, Wand2, Sparkles } from 'lucide-react'
import { Chapter } from '../types'
import { aiSummarize } from '../hooks/useApi'

interface EditorProps {
  chapter: Chapter
  onUpdate: (updates: Partial<Chapter>) => void
}

export default function Editor({ chapter, onUpdate }: EditorProps) {
  const [title, setTitle] = useState(chapter.title)
  const [content, setContent] = useState(chapter.content)
  const [wordCount, setWordCount] = useState(chapter.wordCount)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [localSummary, setLocalSummary] = useState(chapter.summary || '')
  const [localKeywords, setLocalKeywords] = useState<string[]>(chapter.keywords || [])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const summaryTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setTitle(chapter.title)
    setContent(chapter.content)
    setWordCount(chapter.wordCount)
    setLocalSummary(chapter.summary || '')
    setLocalKeywords(chapter.keywords || [])
  }, [chapter.id])

  const countWords = (text: string) => {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
    return chineseChars + englishWords
  }

  // 自动生成摘要
  const autoGenerateSummary = useCallback(async (text: string) => {
    const wordCount = countWords(text)
    if (!text || wordCount < 50) return
    setGeneratingSummary(true)
    try {
      const result = await aiSummarize(text)
      if (result) {
        setLocalSummary(result.summary)
        setLocalKeywords(result.keywords || [])
        onUpdate({
          summary: result.summary,
          keywords: result.keywords || []
        })
      }
    } catch (e) {
      console.error('生成摘要失败:', e)
    } finally {
      setGeneratingSummary(false)
    }
  }, [onUpdate])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    const newCount = countWords(newContent)
    setWordCount(newCount)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      onUpdate({
        content: newContent,
        wordCount: newCount,
      })
    }, 1000)

    // 延迟自动生成摘要（内容超过100字且停止输入5秒后）
    if (summaryTimeoutRef.current) {
      clearTimeout(summaryTimeoutRef.current)
    }
    const currentWordCount = countWords(newContent)
    if (currentWordCount > 100 && !chapter.summary) {
      summaryTimeoutRef.current = setTimeout(() => {
        autoGenerateSummary(newContent)
      }, 5000)
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      onUpdate({ title: newTitle })
    }, 500)
  }

  const handleManualSave = () => {
    const currentWordCount = countWords(content)
    onUpdate({
      title,
      content,
      wordCount: currentWordCount,
    })
    // 手动保存时也生成摘要（超过50字）
    if (currentWordCount >= 50) {
      autoGenerateSummary(content)
    }
  }

  const insertFormat = (format: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.slice(start, end)
    let newText = content

    switch (format) {
      case 'dialogue':
        newText = content.slice(0, start) + `「${selectedText || '对话内容'}」` + content.slice(end)
        break
      case 'scene':
        newText = content.slice(0, start) + `\n【场景：${selectedText || '场景描述'}】\n` + content.slice(end)
        break
      case 'divider':
        newText = content.slice(0, start) + '\n----------\n' + content.slice(end)
        break
    }

    setContent(newText)
    const newCount = countWords(newText)
    setWordCount(newCount)
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      onUpdate({ content: newText, wordCount: newCount })
    }, 1000)
  }

  return (
    <div className="flex flex-col h-full">
      {/* 编辑器工具栏 */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="flex-1 font-semibold text-lg bg-transparent border-none focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-300"
            placeholder={`第${chapter.number}章 标题`}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => insertFormat('dialogue')}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="插入对话"
            >
              <Type className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertFormat('scene')}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="插入场景标记"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => insertFormat('divider')}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="插入分隔线"
            >
              <Hash className="w-4 h-4" />
            </button>
          </div>
          
          <div className="h-4 w-px bg-gray-200 mx-1" />
          
          <span className="text-sm text-gray-400 font-medium">
            {wordCount.toLocaleString()} 字
          </span>
          
          <button
            onClick={handleManualSave}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 text-sm font-medium shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:scale-105 active:scale-95"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          className="w-full h-full p-6 resize-none focus:outline-none text-lg leading-relaxed text-gray-700 bg-white"
          style={{ fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif" }}
          placeholder="开始创作你的故事..."
          spellCheck={false}
        />
      </div>

      {/* 底部信息 */}
      {(localSummary || generatingSummary) && (
        <div className="bg-indigo-50/50 border-t border-gray-100 px-4 py-2 text-sm text-gray-500">
          {generatingSummary ? (
            <span className="flex items-center gap-2 text-indigo-500">
              <Sparkles className="w-4 h-4 animate-spin" />
              正在生成摘要...
            </span>
          ) : (
            <>
              <span className="font-medium text-indigo-600">摘要：</span>
              {localSummary}
              {localKeywords.length > 0 && (
                <span className="ml-2">
                  <span className="font-medium text-indigo-600">关键词：</span>
                  {localKeywords.join(', ')}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

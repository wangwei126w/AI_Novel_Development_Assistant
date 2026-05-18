import { useState, useEffect } from 'react'
import { List, Plus, Trash2, Edit2, Check, X, BookOpen } from 'lucide-react'
import { PlotOutline, Chapter } from '../types'
import FormatButton from './FormatButton'

interface OutlinePanelProps {
  outlines: PlotOutline[]
  chapters: Chapter[]
  onUpdate: (outlines: PlotOutline[]) => void
}

export default function OutlinePanel({ outlines, chapters, onUpdate }: OutlinePanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newOutline, setNewOutline] = useState<Partial<PlotOutline>>({})

  const handleAdd = () => {
    if (!newOutline.title?.trim()) return

    const outline: PlotOutline = {
      id: Date.now().toString(36),
      title: newOutline.title,
      content: newOutline.content || '',
      chapterRange: newOutline.chapterRange,
    }

    onUpdate([...outlines, outline])
    setNewOutline({})
    setShowNewForm(false)
  }

  const handleUpdate = (id: string, updates: Partial<PlotOutline>) => {
    onUpdate(outlines.map(o => o.id === id ? { ...o, ...updates } : o))
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    if (!confirm('确定删除这条大纲吗？')) return
    onUpdate(outlines.filter(o => o.id !== id))
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <List className="w-6 h-6 text-primary-600" />
            情节大纲
          </h2>
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加大纲
          </button>
        </div>

        {showNewForm && (
          <div className="card mb-6">
            <h3 className="font-semibold mb-4">新建大纲节点</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  type="text"
                  value={newOutline.title || ''}
                  onChange={e => setNewOutline({ ...newOutline, title: e.target.value })}
                  className="input-field"
                  placeholder="大纲标题"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">起始章节</label>
                  <input
                    type="number"
                    min={1}
                    value={newOutline.chapterRange?.[0] || ''}
                    onChange={e => {
                      const start = parseInt(e.target.value) || 1
                      const end = newOutline.chapterRange?.[1] || start
                      setNewOutline({
                        ...newOutline,
                        chapterRange: [start, Math.max(start, end)]
                      })
                    }}
                    className="input-field"
                    placeholder="输入章节号"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束章节</label>
                  <input
                    type="number"
                    min={1}
                    value={newOutline.chapterRange?.[1] || ''}
                    onChange={e => {
                      const end = parseInt(e.target.value) || 1
                      const start = newOutline.chapterRange?.[0] || 1
                      setNewOutline({
                        ...newOutline,
                        chapterRange: [Math.min(start, end), end]
                      })
                    }}
                    className="input-field"
                    placeholder="输入章节号"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">内容</label>
                  <FormatButton
                    content={newOutline.content || ''}
                    onFormat={(formatted) => setNewOutline({ ...newOutline, content: formatted })}
                    showLabel={false}
                  />
                </div>
                <textarea
                  value={newOutline.content || ''}
                  onChange={e => setNewOutline({ ...newOutline, content: e.target.value })}
                  className="input-field h-32 resize-none"
                  placeholder="描述这一段情节的发展..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAdd} className="btn-primary">添加</button>
              <button onClick={() => setShowNewForm(false)} className="btn-secondary">取消</button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {outlines.map((outline, index) => (
            <div key={outline.id} className="card">
              {editingId === outline.id ? (
                <OutlineEditForm
                  outline={outline}
                  onSave={(updates) => handleUpdate(outline.id, updates)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold text-lg">{outline.title}</h3>
                        {outline.chapterRange && (
                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            第{outline.chapterRange[0]}章 - 第{outline.chapterRange[1]}章
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingId(outline.id)}
                        className="p-1 text-gray-400 hover:text-primary-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(outline.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {outline.content && (
                    <p className="text-gray-700 whitespace-pre-wrap">{outline.content}</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {outlines.length === 0 && !showNewForm && (
          <div className="text-center py-12 text-gray-500">
            <List className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>还没有情节大纲，点击上方按钮添加</p>
          </div>
        )}
      </div>
    </div>
  )
}

function OutlineEditForm({ outline, onSave, onCancel }: {
  outline: PlotOutline
  onSave: (updates: Partial<PlotOutline>) => void
  onCancel: () => void
}) {
  // 使用本地状态，避免每次输入都触发父组件更新
  const [form, setForm] = useState(outline)
  const [localContent, setLocalContent] = useState(outline.content || '')

  // 同步外部状态到本地
  useEffect(() => {
    setForm(outline)
    setLocalContent(outline.content || '')
  }, [outline])

  // 处理内容更新
  const handleContentChange = (value: string) => {
    setLocalContent(value)
    setForm({ ...form, content: value })
  }

  // 保存时合并本地状态
  const handleSave = () => {
    onSave({ ...form, content: localContent })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">标题</label>
        <input
          type="text"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          className="input-field font-semibold"
          placeholder="大纲标题"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">起始章节</label>
          <input
            type="number"
            min={1}
            value={form.chapterRange?.[0] || ''}
            onChange={e => {
              const start = parseInt(e.target.value) || 1
              const end = form.chapterRange?.[1] || start
              setForm({
                ...form,
                chapterRange: [start, Math.max(start, end)]
              })
            }}
            className="input-field"
            placeholder="起始章节"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">结束章节</label>
          <input
            type="number"
            min={1}
            value={form.chapterRange?.[1] || ''}
            onChange={e => {
              const end = parseInt(e.target.value) || 1
              const start = form.chapterRange?.[0] || 1
              setForm({
                ...form,
                chapterRange: [Math.min(start, end), end]
              })
            }}
            className="input-field"
            placeholder="结束章节"
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-500">内容</label>
          <FormatButton
            content={localContent}
            onFormat={(formatted) => handleContentChange(formatted)}
            showLabel={false}
          />
        </div>
        <textarea
          value={localContent}
          onChange={e => handleContentChange(e.target.value)}
          className="input-field h-32 resize-none"
          placeholder="描述这一段情节的发展..."
        />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="btn-primary text-sm py-1.5">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm py-1.5">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

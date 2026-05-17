import { useState, useEffect, useCallback } from 'react'
import { Globe, Plus, Trash2, Clock, Edit2, Check, X } from 'lucide-react'
import { WorldSettings, TimelineEvent } from '../types'

interface WorldPanelProps {
  worldSettings: WorldSettings
  onUpdate: (settings: WorldSettings) => void
}

export default function WorldPanel({ worldSettings, onUpdate }: WorldPanelProps) {
  const [showTimelineForm, setShowTimelineForm] = useState(false)
  const [newEvent, setNewEvent] = useState<Partial<TimelineEvent>>({})
  
  // 编辑状态
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editEvent, setEditEvent] = useState<Partial<TimelineEvent>>({})
  
  // 本地状态，避免每次输入都触发父组件更新
  const [localBackground, setLocalBackground] = useState(worldSettings.background || '')
  const [localRules, setLocalRules] = useState(worldSettings.rules || '')
  const [localTimeline, setLocalTimeline] = useState<TimelineEvent[]>(worldSettings.timeline || [])

  // 同步外部状态到本地
  useEffect(() => {
    setLocalBackground(worldSettings.background || '')
    setLocalRules(worldSettings.rules || '')
    setLocalTimeline(worldSettings.timeline || [])
  }, [worldSettings])

  // 延迟更新父组件（防抖）
  const debouncedUpdate = useCallback((updates: Partial<WorldSettings>) => {
    onUpdate({ ...worldSettings, ...updates })
  }, [worldSettings, onUpdate])

  // 处理背景更新
  const handleBackgroundChange = (value: string) => {
    setLocalBackground(value)
    window.clearTimeout((window as any).backgroundTimeout)
    ;(window as any).backgroundTimeout = window.setTimeout(() => {
      debouncedUpdate({ background: value })
    }, 500)
  }

  // 处理规则更新
  const handleRulesChange = (value: string) => {
    setLocalRules(value)
    window.clearTimeout((window as any).rulesTimeout)
    ;(window as any).rulesTimeout = window.setTimeout(() => {
      debouncedUpdate({ rules: value })
    }, 500)
  }

  // 失焦时立即更新
  const handleBlur = () => {
    onUpdate({
      ...worldSettings,
      background: localBackground,
      rules: localRules,
      timeline: localTimeline
    })
  }

  // 添加新事件
  const handleAddEvent = () => {
    if (!newEvent.time?.trim() || !newEvent.event?.trim()) return
    
    const event: TimelineEvent = {
      id: Date.now().toString(36),
      time: newEvent.time,
      event: newEvent.event,
      description: newEvent.description || '',
    }
    
    const updatedTimeline = [...localTimeline, event].sort((a, b) => a.time.localeCompare(b.time))
    setLocalTimeline(updatedTimeline)
    onUpdate({
      ...worldSettings,
      timeline: updatedTimeline
    })
    setNewEvent({})
    setShowTimelineForm(false)
  }

  // 开始编辑事件
  const startEditEvent = (event: TimelineEvent) => {
    setEditingEventId(event.id)
    setEditEvent({ ...event })
  }

  // 取消编辑
  const cancelEditEvent = () => {
    setEditingEventId(null)
    setEditEvent({})
  }

  // 保存编辑
  const saveEditEvent = () => {
    if (!editEvent.time?.trim() || !editEvent.event?.trim()) return
    
    const updatedTimeline = localTimeline.map(e => 
      e.id === editingEventId 
        ? { ...e, time: editEvent.time!, event: editEvent.event!, description: editEvent.description || '' }
        : e
    ).sort((a, b) => a.time.localeCompare(b.time))
    
    setLocalTimeline(updatedTimeline)
    onUpdate({
      ...worldSettings,
      timeline: updatedTimeline
    })
    setEditingEventId(null)
    setEditEvent({})
  }

  // 删除事件
  const handleDeleteEvent = (id: string) => {
    if (!confirm('确定删除这个时间线事件吗？')) return
    const updatedTimeline = localTimeline.filter(e => e.id !== id)
    setLocalTimeline(updatedTimeline)
    onUpdate({
      ...worldSettings,
      timeline: updatedTimeline
    })
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary-600" />
          世界观设定
        </h2>

        {/* 背景设定 */}
        <div className="card">
          <h3 className="font-semibold mb-3">世界背景</h3>
          <textarea
            value={localBackground}
            onChange={e => handleBackgroundChange(e.target.value)}
            onBlur={handleBlur}
            className="input-field h-40 resize-none"
            placeholder="描述你的世界背景：时代、地域、社会环境、历史背景等..."
          />
        </div>

        {/* 规则设定 */}
        <div className="card">
          <h3 className="font-semibold mb-3">世界规则</h3>
          <textarea
            value={localRules}
            onChange={e => handleRulesChange(e.target.value)}
            onBlur={handleBlur}
            className="input-field h-40 resize-none"
            placeholder="描述世界运行的规则：魔法体系、科技水平、社会制度、物理法则等..."
          />
        </div>

        {/* 时间线 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-600" />
              时间线 ({localTimeline.length}个事件)
            </h3>
            <button
              onClick={() => setShowTimelineForm(true)}
              className="btn-primary flex items-center gap-1 text-sm py-1.5"
            >
              <Plus className="w-4 h-4" />
              添加事件
            </button>
          </div>

          {showTimelineForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">时间</label>
                  <input
                    type="text"
                    value={newEvent.time || ''}
                    onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="input-field"
                    placeholder="如：第一章前三年"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">事件名称</label>
                  <input
                    type="text"
                    value={newEvent.event || ''}
                    onChange={e => setNewEvent({ ...newEvent, event: e.target.value })}
                    className="input-field"
                    placeholder="事件名称"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">详细描述</label>
                <textarea
                  value={newEvent.description || ''}
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="input-field h-20 resize-none"
                  placeholder="事件详细描述..."
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddEvent} className="btn-primary text-sm">添加</button>
                <button onClick={() => setShowTimelineForm(false)} className="btn-secondary text-sm">取消</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {localTimeline.map((event, index) => (
              <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                  {index < localTimeline.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-300 mt-1" />
                  )}
                </div>
                <div className="flex-1">
                  {editingEventId === event.id ? (
                    // 编辑模式
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">时间</label>
                          <input
                            type="text"
                            value={editEvent.time || ''}
                            onChange={e => setEditEvent({ ...editEvent, time: e.target.value })}
                            className="input-field text-sm"
                            placeholder="如：第一章前三年"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">事件名称</label>
                          <input
                            type="text"
                            value={editEvent.event || ''}
                            onChange={e => setEditEvent({ ...editEvent, event: e.target.value })}
                            className="input-field text-sm"
                            placeholder="事件名称"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">详细描述</label>
                        <textarea
                          value={editEvent.description || ''}
                          onChange={e => setEditEvent({ ...editEvent, description: e.target.value })}
                          className="input-field h-16 resize-none text-sm"
                          placeholder="事件详细描述..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEditEvent} className="btn-primary text-xs py-1 flex items-center gap-1">
                          <Check className="w-3 h-3" /> 保存
                        </button>
                        <button onClick={cancelEditEvent} className="btn-secondary text-xs py-1 flex items-center gap-1">
                          <X className="w-3 h-3" /> 取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 显示模式
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary-700">{event.time}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditEvent(event)}
                            className="text-gray-400 hover:text-primary-600 p-1"
                            title="编辑"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="text-gray-400 hover:text-red-500 p-1"
                            title="删除"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-medium mt-1">{event.event}</h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {localTimeline.length === 0 && (
              <p className="text-gray-400 text-center py-8">还没有时间线事件，点击上方按钮添加</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

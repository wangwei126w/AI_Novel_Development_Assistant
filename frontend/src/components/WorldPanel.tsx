import { useState } from 'react'
import { Globe, Plus, Trash2, Clock } from 'lucide-react'
import { WorldSettings, TimelineEvent } from '../types'

interface WorldPanelProps {
  worldSettings: WorldSettings
  onUpdate: (settings: WorldSettings) => void
}

export default function WorldPanel({ worldSettings, onUpdate }: WorldPanelProps) {
  const [showTimelineForm, setShowTimelineForm] = useState(false)
  const [newEvent, setNewEvent] = useState<Partial<TimelineEvent>>({})

  const handleUpdate = (updates: Partial<WorldSettings>) => {
    onUpdate({ ...worldSettings, ...updates })
  }

  const handleAddEvent = () => {
    if (!newEvent.time?.trim() || !newEvent.event?.trim()) return
    
    const event: TimelineEvent = {
      id: Date.now().toString(36),
      time: newEvent.time,
      event: newEvent.event,
      description: newEvent.description || '',
    }
    
    handleUpdate({
      timeline: [...worldSettings.timeline, event].sort((a, b) => a.time.localeCompare(b.time))
    })
    setNewEvent({})
    setShowTimelineForm(false)
  }

  const handleDeleteEvent = (id: string) => {
    handleUpdate({
      timeline: worldSettings.timeline.filter(e => e.id !== id)
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
            value={worldSettings.background || ''}
            onChange={e => handleUpdate({ background: e.target.value })}
            className="input-field h-40 resize-none"
            placeholder="描述你的世界背景：时代、地域、社会环境、历史背景等..."
          />
        </div>

        {/* 规则设定 */}
        <div className="card">
          <h3 className="font-semibold mb-3">世界规则</h3>
          <textarea
            value={worldSettings.rules || ''}
            onChange={e => handleUpdate({ rules: e.target.value })}
            className="input-field h-40 resize-none"
            placeholder="描述世界运行的规则：魔法体系、科技水平、社会制度、物理法则等..."
          />
        </div>

        {/* 时间线 */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-600" />
              时间线
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
            {worldSettings.timeline.map((event, index) => (
              <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                  {index < worldSettings.timeline.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-300 mt-1" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary-700">{event.time}</span>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <h4 className="font-medium mt-1">{event.event}</h4>
                  {event.description && (
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {worldSettings.timeline.length === 0 && !showTimelineForm && (
            <div className="text-center py-6 text-gray-500 text-sm">
              还没有时间线事件
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

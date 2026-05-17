import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, ChevronRight, AlertTriangle,
  CheckCircle, Clock, BarChart3, FileText, Users,
  Sparkles, Save, Edit3
} from 'lucide-react'
import { getSegments, updateSegmentSummary, getSegmentContext } from '../hooks/useMegaApi'

interface Segment {
  id: number
  name: string
  status: string
  wordCount: number
  chapterCount: number
  capacity: number
  usage: string
}

interface SegmentStats {
  totalWords: number
  totalChapters: number
  completedSegments: number
  activeSegmentId: number
  activeSegmentName: string
  progress: string
  segments: Segment[]
}

export default function SegmentsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [stats, setStats] = useState<SegmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingSegment, setEditingSegment] = useState<number | null>(null)
  const [editSummary, setEditSummary] = useState('')
  const [editEvents, setEditEvents] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null)
  const [segmentContext, setSegmentContext] = useState('')
  const [showContext, setShowContext] = useState(false)

  useEffect(() => {
    if (projectId) {
      loadSegments()
    }
  }, [projectId])

  async function loadSegments() {
    try {
      setLoading(true)
      const data = await getSegments(projectId!)
      setStats(data)
    } catch (e) {
      console.error('加载分段失败:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateSummary(segmentId: number) {
    if (!editSummary.trim()) return

    try {
      setSaving(true)
      const events = editEvents.split('\n').filter(e => e.trim())
      await updateSegmentSummary(projectId!, segmentId, editSummary, events)
      await loadSegments()
      setEditingSegment(null)
      setEditSummary('')
      setEditEvents('')
    } catch (e) {
      console.error('更新摘要失败:', e)
    } finally {
      setSaving(false)
    }
  }

  async function handleViewContext(segmentId: number) {
    try {
      const data = await getSegmentContext(projectId!, segmentId)
      setSegmentContext(data.context || '暂无上下文')
      setSelectedSegment(segmentId)
      setShowContext(true)
    } catch (e) {
      console.error('获取上下文失败:', e)
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200'
      case 'active': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'active': return <Sparkles className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'completed': return '已完成'
      case 'active': return '进行中'
      case 'warning': return '即将满'
      case 'pending': return '未开始'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8faf8] flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-[#f8faf8] flex items-center justify-center">
        <div className="text-gray-500">暂无数据</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8faf8]">
      {/* 头部 */}
      <header className="bg-white/70 backdrop-blur-sm border-b border-emerald-100/50 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/project/${projectId}`)}
              className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">7段式分段管理</h1>
              <p className="text-xs text-gray-500">1000万字小说 · 150万字/段</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSegments}
              className="px-3 py-1.5 text-sm bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              刷新
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-emerald-100/50">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <FileText className="w-3.5 h-3.5" />
              总字数
            </div>
            <div className="text-xl font-bold text-gray-800">
              {(stats.totalWords / 10000).toFixed(1)}万
            </div>
            <div className="text-xs text-gray-400 mt-1">
              目标1000万字
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-emerald-100/50">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              总章节
            </div>
            <div className="text-xl font-bold text-gray-800">
              {stats.totalChapters}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              章
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-emerald-100/50">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <CheckCircle className="w-3.5 h-3.5" />
              已完成段
            </div>
            <div className="text-xl font-bold text-gray-800">
              {stats.completedSegments}/7
            </div>
            <div className="text-xs text-gray-400 mt-1">
              段
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-emerald-100/50">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <BarChart3 className="w-3.5 h-3.5" />
              总进度
            </div>
            <div className="text-xl font-bold text-emerald-600">
              {stats.progress}%
            </div>
            <div className="text-xs text-gray-400 mt-1">
              当前{stats.activeSegmentName}
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="bg-white rounded-xl p-4 border border-emerald-100/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">整体进度</span>
            <span className="text-sm text-gray-500">{stats.progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(parseFloat(stats.progress), 100)}%` }}
            />
          </div>
        </div>

        {/* 段列表 */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            分段详情
          </h2>

          {stats.segments.map((segment) => (
            <div
              key={segment.id}
              className={`bg-white rounded-xl border transition-all ${
                segment.status === 'active'
                  ? 'border-emerald-300 shadow-sm'
                  : 'border-gray-100'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      segment.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : segment.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className="text-sm font-bold">{segment.id}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{segment.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 ${getStatusColor(segment.status)}`}>
                          {getStatusIcon(segment.status)}
                          {getStatusText(segment.status)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(segment.capacity / 10000).toFixed(0)}万字容量 · {(segment.wordCount / 10000).toFixed(1)}万字已用
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleViewContext(segment.id)}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="查看上下文"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingSegment(segment.id)
                        setEditSummary('')
                        setEditEvents('')
                      }}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="编辑摘要"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 容量进度条 */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">容量使用</span>
                    <span className={`font-medium ${
                      parseFloat(segment.usage) > 80
                        ? 'text-red-500'
                        : parseFloat(segment.usage) > 60
                        ? 'text-yellow-600'
                        : 'text-emerald-600'
                    }`}>
                      {segment.usage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        parseFloat(segment.usage) > 80
                          ? 'bg-red-500'
                          : parseFloat(segment.usage) > 60
                          ? 'bg-yellow-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(parseFloat(segment.usage), 100)}%` }}
                    />
                  </div>
                </div>

                {/* 章节范围 */}
                <div className="mt-2 text-xs text-gray-400">
                  章节范围: {segment.id === 1 ? 1 : (segment.id - 1) * 500 + 1} - {segment.id * 500}章
                </div>
              </div>

              {/* 编辑区域 */}
              {editingSegment === segment.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        段摘要
                      </label>
                      <textarea
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        placeholder="输入本段的主要内容摘要..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        关键事件（每行一个）
                      </label>
                      <textarea
                        value={editEvents}
                        onChange={(e) => setEditEvents(e.target.value)}
                        placeholder="输入本段的关键事件，每行一个..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateSummary(segment.id)}
                        disabled={saving}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={() => setEditingSegment(null)}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            使用说明
          </h3>
          <div className="text-xs text-blue-700 space-y-1.5">
            <p>1. <strong>日常写作</strong>：只需打开当前所在段，AI可完整处理本段内的人物、剧情、伏笔</p>
            <p>2. <strong>跨段需求</strong>：使用RAG检索模式，AI会自动从7段中精准调取相关内容</p>
            <p>3. <strong>段切换</strong>：当当前段达到80%容量时，系统会提示切换到新段</p>
            <p>4. <strong>摘要管理</strong>：每段完成后请填写摘要，便于跨段检索和全局理解</p>
          </div>
        </div>
      </main>

      {/* 上下文弹窗 */}
      {showContext && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                第{selectedSegment}段上下文
              </h3>
              <button
                onClick={() => setShowContext(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="text-gray-400 text-lg">&times;</span>
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{segmentContext}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

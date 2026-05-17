import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getClues, createClue, resolveClue, updateClueStatus, getClueReminders, aiExtractClues, getMegaProject, getChaptersPage } from '../hooks/useMegaApi'
import type { Clue, ClueStatus, ClueType } from '../types/mega-novel'
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Archive,
  Trash2,
  Search,
  Filter,
  BookOpen,
  AlertCircle,
  Sparkles,
  Loader2,
  BrainCircuit
} from 'lucide-react'

const clueTypeLabels: Record<string, string> = {
  foreshadowing: '伏笔',
  mystery: '悬念',
  quest: '任务',
  relationship: '关系',
  power: '能力',
  item: '物品',
  location: '地点',
  timeline: '时间线'
}

const clueTypeColors: Record<string, string> = {
  foreshadowing: 'bg-purple-100 text-purple-700',
  mystery: 'bg-blue-100 text-blue-700',
  quest: 'bg-green-100 text-green-700',
  relationship: 'bg-pink-100 text-pink-700',
  power: 'bg-red-100 text-red-700',
  item: 'bg-yellow-100 text-yellow-700',
  location: 'bg-cyan-100 text-cyan-700',
  timeline: 'bg-gray-100 text-gray-700'
}

const statusLabels: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: '活跃', color: 'bg-emerald-100 text-emerald-700', icon: Clock },
  resolved: { label: '已解决', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  dormant: { label: '休眠', color: 'bg-gray-100 text-gray-700', icon: Archive },
  abandoned: { label: '废弃', color: 'bg-red-100 text-red-700', icon: Trash2 }
}

export default function CluesPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [clues, setClues] = useState<Clue[]>([])
  const [reminders, setReminders] = useState<Clue[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<ClueStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentChapter, setCurrentChapter] = useState(1)

  // AI 提取相关状态
  const [showAIExtractModal, setShowAIExtractModal] = useState(false)
  const [aiExtracting, setAiExtracting] = useState(false)
  const [aiExtractResult, setAiExtractResult] = useState<any>(null)
  const [chapters, setChapters] = useState<{id: string, number: number, title: string}[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string>('')

  // 创建表单状态
  const [newClue, setNewClue] = useState({
    title: '',
    description: '',
    type: 'foreshadowing' as ClueType,
    importance: 3,
    chapterNumber: 1,
    expectedResolveChapter: undefined as number | undefined,
    remindBeforeChapter: 3
  })

  useEffect(() => {
    if (projectId && token) {
      loadClues()
      loadReminders()
    }
  }, [projectId, token, filterStatus, filterType])

  const loadClues = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const filters: { status?: ClueStatus; type?: string } = {}
      if (filterStatus !== 'all') filters.status = filterStatus
      if (filterType !== 'all') filters.type = filterType

      const data = await getClues(projectId, filters)
      setClues(data)
    } catch (error) {
      console.error('加载线索失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReminders = async () => {
    if (!projectId) return
    try {
      const data = await getClueReminders(projectId, currentChapter)
      setReminders(data)
    } catch (error) {
      console.error('加载提醒失败:', error)
    }
  }

  const handleCreateClue = async () => {
    if (!projectId || !newClue.title.trim()) return

    try {
      await createClue(projectId, {
        ...newClue,
        chapterId: `ch_${newClue.chapterNumber}`,
        chapterNumber: newClue.chapterNumber
      })
      setShowCreateModal(false)
      setNewClue({
        title: '',
        description: '',
        type: 'foreshadowing',
        importance: 3,
        chapterNumber: 1,
        expectedResolveChapter: undefined,
        remindBeforeChapter: 3
      })
      loadClues()
      loadReminders()
    } catch (error) {
      console.error('创建线索失败:', error)
    }
  }

  const handleResolveClue = async (clueId: string) => {
    if (!projectId) return
    const resolution = prompt('请输入解决方式/填坑内容：')
    if (!resolution) return

    try {
      await resolveClue(projectId, clueId, {
        chapterId: `ch_${currentChapter}`,
        chapterNumber: currentChapter,
        resolution
      })
      loadClues()
      loadReminders()
    } catch (error) {
      console.error('解决线索失败:', error)
    }
  }

  const handleStatusChange = async (clueId: string, status: ClueStatus) => {
    if (!projectId) return
    try {
      await updateClueStatus(projectId, clueId, status)
      loadClues()
    } catch (error) {
      console.error('更新状态失败:', error)
    }
  }

  // 加载章节列表
  const loadChapters = async () => {
    if (!projectId) return
    try {
      const data = await getChaptersPage(projectId, 1, 100)
      setChapters(data.chapters.map(ch => ({ id: ch.id, number: ch.number, title: ch.title })))
      if (data.chapters.length > 0 && !selectedChapterId) {
        setSelectedChapterId(data.chapters[0].id)
      }
    } catch (error) {
      console.error('加载章节失败:', error)
    }
  }

  // AI 智能提取线索
  const handleAIExtract = async () => {
    if (!projectId || !selectedChapterId) return
    
    setAiExtracting(true)
    setAiExtractResult(null)
    
    try {
      const result = await aiExtractClues(projectId, selectedChapterId, {
        analyzeTiming: true,
        checkRelationships: true
      })
      
      setAiExtractResult(result)
      
      if (result.success && result.extracted > 0) {
        loadClues()
        loadReminders()
      }
    } catch (error) {
      console.error('AI 提取失败:', error)
      setAiExtractResult({ success: false, message: '提取失败，请检查 AI 配置', extracted: 0, clues: [] })
    } finally {
      setAiExtracting(false)
    }
  }

  // 打开 AI 提取弹窗时加载章节
  const openAIExtractModal = () => {
    setShowAIExtractModal(true)
    loadChapters()
    setAiExtractResult(null)
  }

  const filteredClues = clues.filter(clue =>
    searchQuery === '' ||
    clue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clue.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeClues = filteredClues.filter(c => c.status === 'active')
  const resolvedClues = filteredClues.filter(c => c.status === 'resolved')

  return (
    <div className="min-h-screen bg-[#f8faf8]">
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-emerald-700" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-emerald-900">线索 / 伏笔追踪</h1>
                <p className="text-sm text-emerald-600">管理小说中的挖坑与填坑</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openAIExtractModal}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors"
              >
                <BrainCircuit className="w-4 h-4" />
                AI 智能提取
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新建线索
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <BookOpen className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-900">{clues.length}</p>
                <p className="text-sm text-emerald-600">总线索</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-900">{activeClues.length}</p>
                <p className="text-sm text-emerald-600">待解决</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-900">{resolvedClues.length}</p>
                <p className="text-sm text-emerald-600">已解决</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-900">{reminders.length}</p>
                <p className="text-sm text-emerald-600">即将到期</p>
              </div>
            </div>
          </div>
        </div>

        {/* 提醒区域 */}
        {reminders.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">⚠️ 即将到期的伏笔（当前第{currentChapter}章）</h3>
            </div>
            <div className="space-y-2">
              {reminders.map(clue => (
                <div key={clue.id} className="flex items-center justify-between bg-white/60 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${clueTypeColors[clue.type]}`}>
                      {clueTypeLabels[clue.type]}
                    </span>
                    <span className="font-medium text-amber-900">{clue.title}</span>
                    <span className="text-sm text-amber-700">
                      {clue.expectedResolveChapter
                        ? `预计第${clue.expectedResolveChapter}章解决`
                        : `已创建${currentChapter - clue.chapterNumber}章`
                      }
                    </span>
                  </div>
                  <button
                    onClick={() => handleResolveClue(clue.id)}
                    className="px-3 py-1 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    填坑
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 筛选和搜索 */}
        <div className="bg-white rounded-xl border border-emerald-100 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700">筛选：</span>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ClueStatus | 'all')}
              className="px-3 py-1.5 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">所有状态</option>
              <option value="active">活跃</option>
              <option value="resolved">已解决</option>
              <option value="dormant">休眠</option>
              <option value="abandoned">废弃</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">所有类型</option>
              {Object.entries(clueTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div className="flex-1" />
            <div className="relative">
              <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索线索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-emerald-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* 线索列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : filteredClues.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
            <p className="text-emerald-600">暂无线索</p>
            <p className="text-sm text-emerald-400 mt-1">点击"新建线索"开始记录伏笔</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClues.map(clue => {
              const StatusIcon = statusLabels[clue.status]?.icon || Clock
              return (
                <div
                  key={clue.id}
                  className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md ${
                    clue.status === 'active' ? 'border-emerald-200' :
                    clue.status === 'resolved' ? 'border-blue-200 opacity-75' :
                    'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${clueTypeColors[clue.type]}`}>
                          {clueTypeLabels[clue.type]}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${statusLabels[clue.status]?.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusLabels[clue.status]?.label}
                        </span>
                        {clue.importance >= 4 && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            重要度{clue.importance}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-emerald-900 mb-1">{clue.title}</h3>
                      <p className="text-sm text-emerald-700 mb-2">{clue.description}</p>
                      <div className="flex items-center gap-4 text-xs text-emerald-500">
                        <span>第{clue.chapterNumber}章创建</span>
                        {clue.expectedResolveChapter && (
                          <span>预计第{clue.expectedResolveChapter}章解决</span>
                        )}
                        <span>提及{clue.mentions?.length || 0}次</span>
                      </div>
                      {clue.resolution && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm text-blue-800">
                          <span className="font-medium">解决方式：</span>{clue.resolution}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {clue.status === 'active' && (
                        <button
                          onClick={() => handleResolveClue(clue.id)}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          填坑
                        </button>
                      )}
                      <select
                        value={clue.status}
                        onChange={(e) => handleStatusChange(clue.id, e.target.value as ClueStatus)}
                        className="px-2 py-1.5 border border-emerald-200 rounded-lg text-sm"
                      >
                        <option value="active">活跃</option>
                        <option value="resolved">已解决</option>
                        <option value="dormant">休眠</option>
                        <option value="abandoned">废弃</option>
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 创建线索模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-bold text-emerald-900 mb-4">新建线索 / 挖坑</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-emerald-700 mb-1">标题</label>
                <input
                  type="text"
                  value={newClue.title}
                  onChange={(e) => setNewClue({ ...newClue, title: e.target.value })}
                  placeholder="例如：神秘黑袍人的身份"
                  className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-emerald-700 mb-1">描述</label>
                <textarea
                  value={newClue.description}
                  onChange={(e) => setNewClue({ ...newClue, description: e.target.value })}
                  placeholder="详细描述这个伏笔..."
                  rows={3}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-emerald-700 mb-1">类型</label>
                  <select
                    value={newClue.type}
                    onChange={(e) => setNewClue({ ...newClue, type: e.target.value as ClueType })}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(clueTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-emerald-700 mb-1">重要性 (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={newClue.importance}
                    onChange={(e) => setNewClue({ ...newClue, importance: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-emerald-700 mb-1">创建章节</label>
                  <input
                    type="number"
                    min={1}
                    value={newClue.chapterNumber}
                    onChange={(e) => setNewClue({ ...newClue, chapterNumber: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-emerald-700 mb-1">预计解决章节</label>
                  <input
                    type="number"
                    min={1}
                    value={newClue.expectedResolveChapter || ''}
                    onChange={(e) => setNewClue({ ...newClue, expectedResolveChapter: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="可选"
                    className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-emerald-700 mb-1">提前提醒章节数</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newClue.remindBeforeChapter}
                  onChange={(e) => setNewClue({ ...newClue, remindBeforeChapter: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-emerald-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateClue}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                创建线索
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 智能提取模态框 */}
      {showAIExtractModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg">
                <BrainCircuit className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI 智能提取线索</h2>
                <p className="text-sm text-gray-500">使用 AI 深度分析章节内容，自动识别伏笔和悬念</p>
              </div>
            </div>

            {/* 章节选择 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">选择要分析的章节</label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {chapters.map(ch => (
                  <option key={ch.id} value={ch.id}>
                    第{ch.number}章：{ch.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 提取按钮 */}
            <button
              onClick={handleAIExtract}
              disabled={aiExtracting || !selectedChapterId}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {aiExtracting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI 分析中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  开始智能提取
                </>
              )}
            </button>

            {/* 提取结果 */}
            {aiExtractResult && (
              <div className="border border-gray-200 rounded-lg p-4">
                {aiExtractResult.success ? (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      {aiExtractResult.extracted > 0 ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      )}
                      <span className="font-medium text-gray-900">{aiExtractResult.message}</span>
                    </div>

                    {aiExtractResult.analysis && (
                      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                        <div className="bg-purple-50 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-purple-600">{aiExtractResult.analysis.totalDetected}</div>
                          <div className="text-gray-600">检测到</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">{aiExtractResult.extracted}</div>
                          <div className="text-gray-600">已保存</div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-gray-600">{aiExtractResult.analysis.duplicatesFiltered}</div>
                          <div className="text-gray-600">重复过滤</div>
                        </div>
                      </div>
                    )}

                    {aiExtractResult.clues && aiExtractResult.clues.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900">提取的线索：</h3>
                        {aiExtractResult.clues.map((clue: any, index: number) => (
                          <div key={clue.id || index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${clueTypeColors[clue.type] || 'bg-gray-100 text-gray-700'}`}>
                                {clueTypeLabels[clue.type] || clue.type}
                              </span>
                              <span className="font-medium text-gray-900">{clue.title}</span>
                              <span className="text-xs text-gray-500">重要性:{clue.importance}/5</span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{clue.description}</p>
                            {clue.reasoning && (
                              <p className="text-xs text-purple-600 mt-1">💡 {clue.reasoning}</p>
                            )}
                            {clue.expectedResolveChapter && (
                              <p className="text-xs text-blue-600 mt-1">📅 建议第{clue.expectedResolveChapter}章解决</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{aiExtractResult.message || '提取失败'}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAIExtractModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

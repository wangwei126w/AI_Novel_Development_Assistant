import { useState, useEffect } from 'react'
import { X, TrendingUp, BookOpen, Users, Calendar, BarChart3 } from 'lucide-react'

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

interface DailyStat {
  date: string
  words: number
}

interface StatsData {
  totalWords: number
  totalChapters: number
  avgWordsPerChapter: number
  characterCount: number
  dailyStats: DailyStat[]
  lastUpdated: number
}

interface StatsPanelProps {
  projectId: string
  onClose: () => void
}

export default function StatsPanel({ projectId, onClose }: StatsPanelProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [projectId])

  async function loadStats() {
    try {
      const res = await fetch(`/api/projects/${projectId}/stats`, {
        headers: { ...getAuthHeaders() }
      })
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error('加载统计失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const maxDailyWords = stats?.dailyStats?.reduce((max, d) => Math.max(max, d.words), 0) || 1

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">写作统计</h2>
              <p className="text-sm text-gray-400">追踪你的创作进度</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-gray-400">加载中...</div>
          ) : stats ? (
            <div className="space-y-6">
              {/* 核心数据 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<BookOpen className="w-5 h-5 text-blue-500" />}
                  label="总字数"
                  value={(stats.totalWords || 0).toLocaleString()}
                />
                <StatCard
                  icon={<TrendingUp className="w-5 h-5 text-green-500" />}
                  label="章节数"
                  value={(stats.totalChapters || 0).toString()}
                />
                <StatCard
                  icon={<Calendar className="w-5 h-5 text-orange-500" />}
                  label="平均每章"
                  value={`${stats.avgWordsPerChapter || 0}字`}
                />
                <StatCard
                  icon={<Users className="w-5 h-5 text-purple-500" />}
                  label="角色数"
                  value={(stats.characterCount || 0).toString()}
                />
              </div>

              {/* 近7天写作趋势 */}
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">近7天写作趋势</h3>
                <div className="flex items-end gap-2 h-40">
                  {stats.dailyStats?.map((day, index) => {
                    const height = day.words > 0 ? (day.words / maxDailyWords) * 100 : 0
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-xs text-gray-400">{day.words > 0 ? day.words : ''}</div>
                        <div
                          className="w-full bg-indigo-100 rounded-t-lg transition-all hover:bg-indigo-200 relative group"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                            {day.date}: {day.words}字
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {day.date?.slice(5) || ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  )
}

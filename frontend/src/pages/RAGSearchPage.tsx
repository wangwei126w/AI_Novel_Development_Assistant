import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Search, Database, RefreshCw, FileText, BarChart3, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react'
import { searchVector, buildIndex, getIndexStats, type VectorSearchResult, type IndexStats } from '../hooks/useMegaApi'

// 版本: 2026-05-17-001 强制刷新缓存
export default function RAGSearchPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [query, setQuery] = useState('')
  const [keywords, setKeywords] = useState('')
  const [topK, setTopK] = useState(5)
  const [results, setResults] = useState<VectorSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [stats, setStats] = useState<IndexStats | null>(null)
  const [error, setError] = useState('')
  const [indexSuccess, setIndexSuccess] = useState('')

  useEffect(() => {
    if (projectId) {
      loadStats()
    }
  }, [projectId])

  async function loadStats() {
    try {
      const data = await getIndexStats(projectId!)
      setStats(data)
    } catch (e) {
      console.error('加载索引统计失败:', e)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    try {
      const keywordList = keywords.split(',').map(k => k.trim()).filter(Boolean)
      const data = await searchVector(projectId!, query, keywordList, topK)
      setResults(data.results)
    } catch (e) {
      setError('搜索失败: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleBuildIndex() {
    setIndexing(true)
    setError('')
    setIndexSuccess('')
    try {
      const data = await buildIndex(projectId!)
      setIndexSuccess(`索引构建完成！共 ${data.totalChunks} 个文本块`)
      await loadStats()
    } catch (e) {
      setError('构建索引失败: ' + (e as Error).message)
    } finally {
      setIndexing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-emerald-600" />
            RAG 向量检索
          </h1>
          <p className="text-gray-600 mt-2">
            基于向量相似度的智能检索系统，支持跨章节内容关联查询
          </p>
        </div>

        {/* 索引状态卡片 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              索引状态
            </h2>
            <button
              onClick={handleBuildIndex}
              disabled={indexing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${indexing ? 'animate-spin' : ''}`} />
              {indexing ? '构建中...' : '重建索引'}
            </button>
          </div>

          {stats ? (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-700">{stats.totalVectors}</div>
                <div className="text-sm text-emerald-600">向量总数</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-700">{stats.totalChunks}</div>
                <div className="text-sm text-emerald-600">文本块数</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-700">{stats.chapterCount}</div>
                <div className="text-sm text-emerald-600">已索引章节</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-700">{stats.dimension}</div>
                <div className="text-sm text-emerald-600">向量维度</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">
              暂无索引数据，请点击"重建索引"
            </div>
          )}
        </div>

        {/* 消息提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {indexSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 flex items-center gap-2 text-emerald-700">
            <CheckCircle className="w-5 h-5" />
            {indexSuccess}
          </div>
        )}

        {/* 搜索表单 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-600" />
            向量搜索
          </h2>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                搜索查询
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入搜索内容，如：林凡炼丹、混沌灵根..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  关键词辅助（可选，用逗号分隔）
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="如：混沌, 灵根, 炼丹"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  返回结果数
                </label>
                <select
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value={3}>3 条</option>
                  <option value={5}>5 条</option>
                  <option value={10}>10 条</option>
                  <option value={20}>20 条</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
            >
              <Search className="w-5 h-5" />
              {loading ? '搜索中...' : '开始搜索'}
            </button>
          </form>
        </div>

        {/* 搜索结果 */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              搜索结果 ({results.length} 条)
            </h2>

            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {result.metadata.chapterTitle || '未知章节'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500">相关度</div>
                      <div className={`text-lg font-bold ${
                        result.score > 0.5 ? 'text-emerald-600' :
                        result.score > 0.3 ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {(result.score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full ${
                        result.score > 0.5 ? 'bg-emerald-500' :
                        result.score > 0.3 ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}
                      style={{ width: `${result.score * 100}%` }}
                    />
                  </div>

                  {/* 内容预览 */}
                  <div className="bg-gray-50 rounded-lg p-3 text-gray-700 text-sm leading-relaxed">
                    {result.content.length > 300
                      ? result.content.substring(0, 300) + '...'
                      : result.content}
                  </div>

                  {/* 元数据 */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.metadata.chapterNumber && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        第{result.metadata.chapterNumber}章
                      </span>
                    )}
                    {result.metadata.chunkIndex !== undefined && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        块 {result.metadata.chunkIndex + 1}/{result.metadata.totalChunks}
                      </span>
                    )}
                    {result.metadata.keywords && result.metadata.keywords.length > 0 && (
                      <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded">
                        关键词: {result.metadata.keywords.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使用说明 */}
        <div className="bg-emerald-50 rounded-xl p-6 mt-6">
          <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            什么是 RAG 向量检索？
          </h3>
          <div className="text-sm text-emerald-800 space-y-3">
            <p>
              <strong>RAG (Retrieval-Augmented Generation)</strong> 是一种结合检索和生成的AI技术。
              它先把你的小说内容转换成"向量"（数字表示），当你提问时，系统能快速找到最相关的段落。
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-emerald-700 mb-2">🎯 核心作用</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>跨章节查找相关内容</li>
                  <li>语义搜索（找意思相近的内容）</li>
                  <li>伏笔呼应检查</li>
                  <li>角色设定一致性验证</li>
                </ul>
              </div>
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-medium text-emerald-700 mb-2">💡 使用场景</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>"主角什么时候获得的宝物？"</li>
                  <li>"前面提到的神秘人是谁？"</li>
                  <li>"检查伏笔是否已经回收"</li>
                  <li>"角色能力设定是否矛盾"</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white rounded-lg">
              <strong>使用提示：</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>添加或修改章节后，点击"重建索引"更新数据</li>
                <li>关键词辅助可以提高特定词汇的结果排名</li>
                <li>向量搜索基于语义，即使用词不同也能找到相关内容</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

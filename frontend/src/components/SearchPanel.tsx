import { useState } from 'react'
import { Search, X, FileText, Users, Globe, ArrowRight } from 'lucide-react'

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

interface SearchResult {
  type: string
  id: string
  title: string
  snippet: string
}

interface SearchPanelProps {
  projectId: string
  onClose: () => void
  onNavigate: (type: string, id: string) => void
}

export default function SearchPanel({ projectId, onClose, onNavigate }: SearchPanelProps) {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!keyword.trim()) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/search?q=${encodeURIComponent(keyword)}`, {
        headers: { ...getAuthHeaders() }
      })
      const data = await res.json()
      setResults(data.results || [])
    } catch (e) {
      console.error('搜索失败:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'character': return <Users className="w-4 h-4 text-indigo-500" />
      case 'world': return <Globe className="w-4 h-4 text-green-500" />
      default: return <FileText className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* 搜索头部 */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-lg outline-none placeholder-gray-300"
              placeholder="搜索章节、角色、世界观..."
              autoFocus
            />
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center text-gray-400">
              搜索中...
            </div>
          )}

          {!loading && results.length === 0 && keyword && (
            <div className="p-8 text-center text-gray-400">
              未找到相关内容
            </div>
          )}

          {!loading && results.map((result, index) => (
            <button
              key={index}
              onClick={() => {
                onNavigate(result.type, result.id)
                onClose()
              }}
              className="w-full text-left p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getIcon(result.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 mb-1">{result.title}</div>
                  <div 
                    className="text-sm text-gray-500 line-clamp-2"
                    dangerouslySetInnerHTML={{ 
                      __html: result.snippet.replace(/\*\*(.*?)\*\*/g, '<mark class="bg-yellow-200">$1</mark>') 
                    }}
                  />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 mt-1" />
              </div>
            </button>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="p-3 bg-gray-50 text-xs text-gray-400 text-center">
          按 Enter 搜索，点击结果跳转
        </div>
      </div>
    </div>
  )
}

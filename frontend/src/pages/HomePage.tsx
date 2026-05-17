import { useState, useEffect } from 'react'
import { BookOpen, Plus, Trash2, Clock, FileText, ArrowRight, Sparkles, Lock, Unlock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Project } from '../types'
import { fetchProjects, createProject, deleteProject } from '../hooks/useApi'
import UserMenu from '../components/UserMenu'

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSummary, setNewSummary] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    const data = await fetchProjects()
    setProjects(data || [])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return

    await createProject(newTitle, newSummary)
    setNewTitle('')
    setNewSummary('')
    setShowNewForm(false)
    loadProjects()
  }

  async function handleDelete(project: Project) {
    if (project.locked) {
      alert('该项目已锁定，无法删除')
      return
    }
    if (!confirm('确定要删除这个项目吗？')) return
    await deleteProject(project.id)
    loadProjects()
  }

  async function handleToggleLock(project: Project) {
    const updatedProject = { ...project, locked: !project.locked }
    // 使用 updateProject API 更新项目
    const { updateProject } = await import('../hooks/useApi')
    await updateProject(project.id, { locked: updatedProject.locked })
    loadProjects()
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }

  function formatWordCount(count: number) {
    if (count > 10000) {
      return `${(count / 10000).toFixed(1)}万字`
    }
    return `${count}字`
  }

  return (
    <div className="min-h-screen bg-[#f0f7f0]">
      {/* 顶部导航 */}
      <header className="bg-white/70 backdrop-blur-sm border-b border-emerald-100/50 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">AI 长篇小说写作助手</h1>
              <p className="text-sm text-gray-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                智能辅助，让创作更流畅
              </p>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 新建按钮 */}
        <div className="mb-8">
          {!showNewForm ? (
            <button
              onClick={() => setShowNewForm(true)}
              className="btn-primary flex items-center gap-2 text-base shadow-lg shadow-emerald-200/50"
            >
              <Plus className="w-5 h-5" />
              新建小说项目
            </button>
          ) : (
            <form onSubmit={handleCreate} className="card max-w-lg border-emerald-100 bg-white/80 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                新建小说项目
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    作品名称 *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="input-field"
                    placeholder="输入小说名称"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    简介
                  </label>
                  <textarea
                    value={newSummary}
                    onChange={(e) => setNewSummary(e.target.value)}
                    className="input-field h-24 resize-none"
                    placeholder="简要描述你的小说..."
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary">创建</button>
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="btn-secondary"
                  >
                    取消
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* 项目列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card hover:shadow-lg transition-all group border-emerald-100/60 bg-white/80 backdrop-blur-sm">
              <div className="flex justify-between items-start mb-3">
                <Link
                  to={`/project/${project.id}`}
                  className="text-lg font-semibold text-gray-800 hover:text-emerald-600 transition-colors flex items-center gap-2"
                >
                  {project.locked && <Lock className="w-4 h-4 text-amber-500" />}
                  {project.title}
                </Link>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleToggleLock(project)}
                    className="text-gray-300 hover:text-amber-500 transition-colors p-1"
                    title={project.locked ? '解锁项目' : '锁定项目'}
                  >
                    {project.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                  {project.locked ? null : (
                    <button
                      onClick={() => handleDelete(project)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      title="删除项目"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                {project.summary || '暂无简介'}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {formatWordCount(project.wordCount || 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDate(project.updatedAt)}
                  </span>
                </div>

                <Link
                  to={`/project/${project.id}`}
                  className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all"
                >
                  进入
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && !showNewForm && (
          <div className="text-center py-20 text-gray-400">
            <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-emerald-300" />
            </div>
            <p className="text-lg mb-1">还没有小说项目</p>
            <p className="text-sm">点击上方按钮创建你的第一部作品</p>
          </div>
        )}
      </div>
    </div>
  )
}

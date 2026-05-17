import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, BookOpen, FileText, Users, Globe,
  List, Sparkles, ChevronRight, Plus, Save,
  Search, BarChart3, Download, Moon, Sun,
  Trash2, Lock, Unlock, GitBranch, Layers,
  Database
} from 'lucide-react'
import { Project, Chapter, WriteMode } from '../types'
import { getProject, updateProject, aiWrite, aiSummarize, exportProject, generateSummaries, getAuthHeaders } from '../hooks/useApi'
import Editor from '../components/Editor'
import CharacterPanel from '../components/CharacterPanel'
import WorldPanel from '../components/WorldPanel'
import AIAssistant from '../components/AIAssistant'
import OutlinePanel from '../components/OutlinePanel'
import SearchPanel from '../components/SearchPanel'
import StatsPanel from '../components/StatsPanel'
import UserMenu from '../components/UserMenu'

type TabType = 'editor' | 'characters' | 'world' | 'outline' | 'ai'

const tabs = [
  { id: 'editor' as TabType, label: '写作', icon: FileText },
  { id: 'characters' as TabType, label: '角色', icon: Users },
  { id: 'world' as TabType, label: '世界', icon: Globe },
  { id: 'outline' as TabType, label: '大纲', icon: List },
  { id: 'ai' as TabType, label: 'AI助手', icon: Sparkles },
]

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('editor')
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showVolumeModal, setShowVolumeModal] = useState(false)
  const [showBatchSummaryModal, setShowBatchSummaryModal] = useState(false)
  const [generatingSummaries, setGeneratingSummaries] = useState(false)
  const [volumeForm, setVolumeForm] = useState({ title: '', summary: '' })
  const [editingVolume, setEditingVolume] = useState<{ id: string, title: string, summary: string } | null>(null)
  const [expandedVolumes, setExpandedVolumes] = useState<Record<string, boolean>>({})
  const [showAddChapterModal, setShowAddChapterModal] = useState(false)
  const [newChapterVolumeId, setNewChapterVolumeId] = useState<string>('')
  const [draggingChapter, setDraggingChapter] = useState<string | null>(null)
  const [dragOverVolume, setDragOverVolume] = useState<string | null>(null)

  useEffect(() => {
    if (id) loadProject()
  }, [id])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', darkMode.toString())
  }, [darkMode])

  async function loadProject() {
    const data = await getProject(id!)
    setProject(data)
    if (data.chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(data.chapters[0].id)
    }
  }

  const handleUpdateProject = useCallback(async (updates: Partial<Project>) => {
    if (!project) return
    setSaving(true)
    const updated = await updateProject(project.id, updates)
    setProject(updated)
    setSaving(false)
  }, [project])

  const handleAddChapter = useCallback(() => {
    if (!project) return
    // 如果有卷，显示选择弹窗
    if ((project.volumes || []).length > 0) {
      setShowAddChapterModal(true)
      setNewChapterVolumeId('')
    } else {
      // 没有卷，直接添加
      createChapter()
    }
  }, [project])

  const createChapter = useCallback((volumeId?: string) => {
    if (!project) return
    const chapters = project.chapters || []
    const newChapter: Chapter = {
      id: Date.now().toString(36),
      number: chapters.length + 1,
      title: `第${chapters.length + 1}章`,
      content: '',
      wordCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      volumeId: volumeId || undefined,
    }
    const updatedChapters = [...chapters, newChapter]
    handleUpdateProject({ chapters: updatedChapters })
    setActiveChapterId(newChapter.id)
    setActiveTab('editor')
    setShowAddChapterModal(false)
  }, [project, handleUpdateProject])

  const handleUpdateChapter = useCallback((chapterId: string, updates: Partial<Chapter>) => {
    if (!project) return
    const chapters = project.chapters || []
    const updatedChapters = chapters.map(ch =>
      ch.id === chapterId ? { ...ch, ...updates, updatedAt: Date.now() } : ch
    )
    handleUpdateProject({ chapters: updatedChapters })
  }, [project, handleUpdateProject])

  const handleDeleteChapter = useCallback((chapterId: string) => {
    if (!project) return
    const chapters = project.chapters || []
    const chapter = chapters.find(ch => ch.id === chapterId)
    if (chapter?.locked) {
      alert('该章节已锁定，无法删除')
      return
    }
    if (!confirm('确定删除这一章吗？')) return
    const updatedChapters = chapters.filter(ch => ch.id !== chapterId)
    handleUpdateProject({ chapters: updatedChapters })
    if (activeChapterId === chapterId) {
      setActiveChapterId(updatedChapters[0]?.id || null)
    }
  }, [project, activeChapterId, handleUpdateProject])

  const handleToggleChapterLock = useCallback((chapterId: string) => {
    if (!project) return
    const chapters = project.chapters || []
    const updatedChapters = chapters.map(ch => {
      if (ch.id === chapterId) {
        return { ...ch, locked: !ch.locked }
      }
      return ch
    })
    handleUpdateProject({ chapters: updatedChapters })
  }, [project, handleUpdateProject])

  const handleAIWrite = useCallback(async (mode: WriteMode, prompt?: string, style?: string) => {
    if (!project || !activeChapterId) return null
    const result = await aiWrite({
      projectId: project.id,
      chapterId: activeChapterId,
      mode,
      prompt,
      style,
    })
    return result?.content || null
  }, [project, activeChapterId])

  const handleGenerateSummary = useCallback(async (chapterId: string) => {
    if (!project) return
    
    // 从后端获取章节内容
    try {
      const res = await fetch(`/api/projects/${project.id}/chapters/${chapterId}`, {
        headers: { ...getAuthHeaders() }
      })
      if (!res.ok) throw new Error('获取章节内容失败')
      const data = await res.json()
      const content = data.content
      
      if (!content || content.length < 50) {
        alert('章节内容不足50字，无法生成摘要')
        return
      }

      const result = await aiSummarize(content)
      if (result) {
        handleUpdateChapter(chapterId, {
          summary: result.summary,
          keywords: result.keywords
        })
        alert('摘要生成成功！')
      }
    } catch (e) {
      console.error('生成摘要失败:', e)
      alert('生成摘要失败，请重试')
    }
  }, [project, handleUpdateChapter])

  const handleNavigate = (type: string, id: string) => {
    if (type === 'chapter') {
      setActiveChapterId(id)
      setActiveTab('editor')
    } else if (type === 'character') {
      setActiveTab('characters')
    } else if (type === 'world') {
      setActiveTab('world')
    }
  }

  // 添加卷
  const handleAddVolume = useCallback(() => {
    if (!project || !volumeForm.title.trim()) return
    const volumes = project.volumes || []
    const newVolume = {
      id: 'vol_' + Date.now(),
      number: volumes.length + 1,
      title: volumeForm.title.trim(),
      summary: volumeForm.summary.trim(),
      chapterIds: [],
      createdAt: Date.now()
    }
    handleUpdateProject({ volumes: [...volumes, newVolume] })
    setVolumeForm({ title: '', summary: '' })
    setShowVolumeModal(false)
  }, [project, volumeForm, handleUpdateProject])

  // 删除卷
  const handleDeleteVolume = useCallback((volumeId: string) => {
    if (!project) return
    if (!confirm('确定要删除这个卷吗？卷内的章节将变为未分卷状态。')) return
    
    const volumes = project.volumes || []
    const updatedVolumes = volumes.filter(v => v.id !== volumeId)
    // 重新编号
    updatedVolumes.forEach((v, idx) => { v.number = idx + 1 })
    
    // 将卷内章节的 volumeId 清空
    const chapters = project.chapters || []
    const updatedChapters = chapters.map(ch => 
      ch.volumeId === volumeId ? { ...ch, volumeId: undefined } : ch
    )
    
    handleUpdateProject({ volumes: updatedVolumes, chapters: updatedChapters })
  }, [project, handleUpdateProject])

  // 编辑卷
  const handleEditVolume = useCallback((volume: { id: string, title: string, summary: string }) => {
    setEditingVolume(volume)
  }, [])

  // 保存编辑的卷
  const handleSaveEditVolume = useCallback(() => {
    if (!project || !editingVolume || !editingVolume.title.trim()) return
    
    const volumes = project.volumes || []
    const updatedVolumes = volumes.map(v => 
      v.id === editingVolume.id 
        ? { ...v, title: editingVolume.title.trim(), summary: editingVolume.summary.trim() }
        : v
    )
    
    handleUpdateProject({ volumes: updatedVolumes })
    setEditingVolume(null)
  }, [project, editingVolume, handleUpdateProject])

  // 批量生成摘要
  const handleBatchGenerateSummaries = useCallback(async () => {
    if (!project) return
    setGeneratingSummaries(true)
    try {
      const result = await generateSummaries(project.id)
      if (result?.success) {
        alert(`成功生成 ${result.generated} 个章节摘要`)
        loadProject()
      } else {
        alert('生成摘要失败: ' + (result?.error || '未知错误'))
      }
    } catch (e) {
      alert('生成摘要出错')
    } finally {
      setGeneratingSummaries(false)
      setShowBatchSummaryModal(false)
    }
  }, [project])

  // 将章节分配到卷
  const handleAssignChapterToVolume = useCallback((chapterId: string, volumeId: string | null) => {
    if (!project) return
    const chapters = project.chapters || []
    const updatedChapters = chapters.map(ch =>
      ch.id === chapterId ? { ...ch, volumeId: volumeId || undefined } : ch
    )
    handleUpdateProject({ chapters: updatedChapters })
  }, [project, handleUpdateProject])

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f0f7f0]">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  const activeChapter = (project.chapters || []).find(ch => ch.id === activeChapterId)

  return (
    <div className={`flex h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-[#f0f7f0]'}`}>
      {/* 左侧边栏 */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 border-r border-emerald-100/50 dark:border-gray-800 flex flex-col bg-white/80 dark:bg-gray-900 backdrop-blur-sm overflow-hidden`}>
        {/* 项目头部 */}
        <div className="p-4 border-b border-emerald-100/50 dark:border-gray-800">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 mb-3 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </button>

          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <h1 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{project.title}</h1>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {(project.chapters || []).length} 章 · {project.wordCount?.toLocaleString() || 0} 字
            {saving && <span className="ml-2 text-emerald-500">保存中...</span>}
          </p>
        </div>

        {/* 章节列表 - 树形结构 */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">目录</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowVolumeModal(true)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="添加卷"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowBatchSummaryModal(true)}
                className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="批量生成摘要"
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={handleAddChapter}
                className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="添加章节"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 树形结构：卷和章节 */}
          <div className="space-y-1">
            {/* 未分卷的章节 */}
            {(() => {
              const unassignedChapters = (project.chapters || []).filter(ch => !ch.volumeId)
              const hasVolumes = (project.volumes || []).length > 0
              
              // 如果没有卷，直接显示章节列表
              if (!hasVolumes) {
                return unassignedChapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${
                      activeChapterId === chapter.id
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                    } ${draggingChapter === chapter.id ? 'opacity-50' : ''}`}
                  >
                    <span 
                      className="w-4 text-center text-xs text-gray-400 cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move'
                        setDraggingChapter(chapter.id)
                      }}
                      onDragEnd={() => setDraggingChapter(null)}
                      title="拖拽移动章节"
                    >
                      <svg className="w-3 h-3 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/>
                      </svg>
                    </span>
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => {
                        setActiveChapterId(chapter.id)
                        setActiveTab('editor')
                      }}
                    >
                      <div className="truncate">{chapter.title}</div>
                      <div className="text-xs text-gray-400">{chapter.wordCount} 字</div>
                    </div>
                  </div>
                ))
              }
              
              // 有卷时显示放置区域
              return (
                <>
                  {/* 放置区域 - 独立的drop target */}
                  <div 
                    className={`mb-2 rounded-lg transition-all ${
                      dragOverVolume === 'unassigned' 
                        ? 'ring-2 ring-emerald-400 bg-emerald-50' 
                        : 'border-2 border-dashed border-gray-300'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      setDragOverVolume('unassigned')
                    }}
                    onDragLeave={() => setDragOverVolume(null)}
                    onDrop={(e) => {
                      e.preventDefault()
                      console.log('Drop on unassigned, draggingChapter:', draggingChapter)
                      if (draggingChapter) {
                        handleAssignChapterToVolume(draggingChapter, null)
                        setDraggingChapter(null)
                        setDragOverVolume(null)
                      }
                    }}
                  >
                    <div className={`px-3 py-3 text-sm text-center transition-colors ${
                      dragOverVolume === 'unassigned' 
                        ? 'text-emerald-600 font-medium' 
                        : 'text-gray-400'
                    }`}>
                      {dragOverVolume === 'unassigned' ? '👆 松开取消分卷' : '📥 拖拽章节到此处取消分卷'}
                    </div>
                  </div>
                  
                  {/* 未分卷章节列表 */}
                  {unassignedChapters.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-2 py-1 text-xs text-gray-400">未分卷章节</div>
                      {unassignedChapters.map((chapter) => (
                        <div
                          key={chapter.id}
                          className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-all ${
                            activeChapterId === chapter.id
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                          } ${draggingChapter === chapter.id ? 'opacity-50' : ''}`}
                        >
                          <span 
                            className="w-4 text-center text-xs text-gray-400 cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move'
                              setDraggingChapter(chapter.id)
                            }}
                            onDragEnd={() => setDraggingChapter(null)}
                            title="拖拽移动章节"
                          >
                            <svg className="w-3 h-3 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/>
                            </svg>
                          </span>
                          <div 
                            className="flex-1 min-w-0"
                            onClick={() => {
                              setActiveChapterId(chapter.id)
                              setActiveTab('editor')
                            }}
                          >
                            <div className="truncate">{chapter.title}</div>
                            <div className="text-xs text-gray-400">{chapter.wordCount} 字</div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleGenerateSummary(chapter.id)
                              }}
                              className="p-1 text-gray-400 hover:text-emerald-600"
                              title="生成摘要"
                            >
                              <Sparkles className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleChapterLock(chapter.id)
                              }}
                              className="p-1 text-gray-400 hover:text-amber-500"
                              title={chapter.locked ? '解锁' : '锁定'}
                            >
                              {chapter.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            </button>
                            {!chapter.locked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteChapter(chapter.id)
                                }}
                                className="p-1 text-gray-400 hover:text-red-500"
                                title="删除"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {chapter.locked && <span className="text-xs text-amber-500 ml-1">🔒</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}

            {/* 按卷分组的章节 */}
            {(project.volumes || []).map((volume) => {
              const volumeChapters = (project.chapters || []).filter(ch => ch.volumeId === volume.id)
              
              return (
                <div 
                  key={volume.id} 
                  className={`border rounded-lg overflow-hidden transition-all ${
                    dragOverVolume === volume.id 
                      ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-300' 
                      : 'border-gray-100 dark:border-gray-800'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDragOverVolume(volume.id)
                  }}
                  onDragLeave={() => setDragOverVolume(null)}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (draggingChapter) {
                      handleAssignChapterToVolume(draggingChapter, volume.id)
                      setDraggingChapter(null)
                      setDragOverVolume(null)
                      setExpandedVolumes(prev => ({ ...prev, [volume.id]: true }))
                    }
                  }}
                >
                  {/* 卷标题 - 可点击展开/收起 */}
                  <div
                    className="group flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ChevronRight 
                      className={`w-4 h-4 text-gray-400 transition-transform ${expandedVolumes[volume.id] !== false ? 'rotate-90' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedVolumes(prev => ({ ...prev, [volume.id]: !prev[volume.id] }))
                      }}
                    />
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => setExpandedVolumes(prev => ({ ...prev, [volume.id]: !prev[volume.id] }))}
                    >
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        第{volume.number}卷 {volume.title}
                      </div>
                      <div className="text-xs text-gray-400">
                        {volumeChapters.length} 章
                        {volume.summary && ' · ' + volume.summary.slice(0, 20) + '...'}
                      </div>
                    </div>
                    {/* 卷的操作按钮 */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditVolume(volume)
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="编辑卷"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteVolume(volume.id)
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="删除卷"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  {/* 卷下的章节 */}
                  {expandedVolumes[volume.id] !== false && volumeChapters.length > 0 && (
                    <div className="py-1">
                      {volumeChapters.map((chapter) => (
                        <div
                          key={chapter.id}
                          className={`group flex items-center gap-2 px-3 py-2 pl-10 cursor-pointer text-sm transition-all ${
                            activeChapterId === chapter.id
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                          } ${draggingChapter === chapter.id ? 'opacity-50' : ''}`}
                        >
                          <span 
                            className="w-4 text-center text-xs text-gray-400 cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move'
                              setDraggingChapter(chapter.id)
                            }}
                            onDragEnd={() => setDraggingChapter(null)}
                            title="拖拽移动章节"
                          >
                            <svg className="w-3 h-3 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"/>
                            </svg>
                          </span>
                          <div 
                            className="flex-1 min-w-0"
                            onClick={() => {
                              setActiveChapterId(chapter.id)
                              setActiveTab('editor')
                            }}
                          >
                            <div className="truncate">{chapter.title}</div>
                            <div className="text-xs text-gray-400">{chapter.wordCount} 字</div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleGenerateSummary(chapter.id)
                              }}
                              className={`p-1 ${chapter.summary ? 'text-emerald-500' : 'text-gray-400 hover:text-emerald-600'}`}
                              title={chapter.summary ? '已生成摘要' : '生成摘要'}
                            >
                              <Sparkles className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleToggleChapterLock(chapter.id)
                              }}
                              className="p-1 text-gray-400 hover:text-amber-500"
                              title={chapter.locked ? '解锁' : '锁定'}
                            >
                              {chapter.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            </button>
                            {!chapter.locked && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteChapter(chapter.id)
                                }}
                                className="p-1 text-gray-400 hover:text-red-500"
                                title="删除"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {chapter.locked && <span className="text-xs text-amber-500 ml-1">🔒</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {expandedVolumes[volume.id] !== false && volumeChapters.length === 0 && (
                    <div className="px-3 py-2 pl-10 text-xs text-gray-400">
                      暂无章节
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {(project.chapters || []).length === 0 && (project.volumes || []).length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              点击 + 添加第一章
            </div>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部导航栏 */}
        <header className="bg-white/70 dark:bg-gray-900/80 backdrop-blur-sm border-b border-emerald-100/50 dark:border-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-emerald-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
            >
              <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Tab 导航 */}
            <nav className="flex gap-1 ml-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            {/* 搜索 */}
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="全文搜索"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* 线索追踪 */}
            <button
              onClick={() => navigate(`/project/${id}/clues`)}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="线索追踪"
            >
              <GitBranch className="w-4 h-4" />
            </button>

            {/* 分段管理 */}
            <button
              onClick={() => navigate(`/project/${id}/segments`)}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="分段管理"
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* RAG向量检索 */}
            <button
              onClick={() => navigate(`/project/${id}/search`)}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="RAG向量检索"
            >
              <Database className="w-4 h-4" />
            </button>

            {/* 统计 */}
            <button
              onClick={() => setShowStats(true)}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="写作统计"
            >
              <BarChart3 className="w-4 h-4" />
            </button>

            {/* 导出 */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="导出"
              >
                <Download className="w-4 h-4" />
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-emerald-100 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50 min-w-[120px]">
                  <button
                    onClick={() => {
                      exportProject(project.id, 'txt')
                      setShowExportMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    导出 TXT
                  </button>
                  <button
                    onClick={() => {
                      exportProject(project.id, 'docx')
                      setShowExportMenu(false)
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    导出 DOCX
                  </button>
                </div>
              )}
            </div>

            {/* 夜间模式 */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={darkMode ? '切换日间模式' : '切换夜间模式'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

            <span className="text-xs text-gray-400">
              {activeChapter?.wordCount || 0} 字
            </span>

            <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

            <UserMenu />
          </div>
        </header>

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden bg-[#f0f7f0]/50 dark:bg-gray-900">
          {activeTab === 'editor' && activeChapter && (
            <Editor
              chapter={activeChapter}
              onUpdate={(updates) => handleUpdateChapter(activeChapter.id, updates)}
            />
          )}

          {activeTab === 'characters' && (
            <CharacterPanel
              characters={project.characters}
              onUpdate={(characters) => handleUpdateProject({ characters })}
            />
          )}

          {activeTab === 'world' && (
            <WorldPanel
              worldSettings={project.worldSettings}
              onUpdate={(worldSettings) => handleUpdateProject({ worldSettings })}
            />
          )}

          {activeTab === 'outline' && (
            <OutlinePanel
              outlines={project.plotOutlines}
              chapters={project.chapters || []}
              onUpdate={(plotOutlines) => handleUpdateProject({ plotOutlines })}
            />
          )}

          {activeTab === 'ai' && (
            <AIAssistant
              project={project}
              activeChapter={activeChapter}
              onAIWrite={handleAIWrite}
            />
          )}
        </div>
      </div>

      {/* 搜索弹窗 */}
      {showSearch && project && (
        <SearchPanel
          projectId={project.id}
          onClose={() => setShowSearch(false)}
          onNavigate={handleNavigate}
        />
      )}

      {/* 统计弹窗 */}
      {showStats && project && (
        <StatsPanel
          projectId={project.id}
          onClose={() => setShowStats(false)}
        />
      )}

      {/* 添加卷弹窗 */}
      {showVolumeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">添加新卷</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">卷标题</label>
                <input
                  type="text"
                  value={volumeForm.title}
                  onChange={(e) => setVolumeForm({ ...volumeForm, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  placeholder="如：第一卷 风云初起"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">卷概要</label>
                <textarea
                  value={volumeForm.summary}
                  onChange={(e) => setVolumeForm({ ...volumeForm, summary: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 h-20 resize-none"
                  placeholder="描述本卷的主要内容..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowVolumeModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddVolume}
                disabled={!volumeForm.title.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑卷弹窗 */}
      {editingVolume && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">编辑卷</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">卷标题</label>
                <input
                  type="text"
                  value={editingVolume.title}
                  onChange={(e) => setEditingVolume({ ...editingVolume, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                  placeholder="如：第一卷 风云初起"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">卷概要</label>
                <textarea
                  value={editingVolume.summary}
                  onChange={(e) => setEditingVolume({ ...editingVolume, summary: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 h-20 resize-none"
                  placeholder="描述本卷的主要内容..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditingVolume(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEditVolume}
                disabled={!editingVolume.title.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量生成摘要弹窗 */}
      {showBatchSummaryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">批量生成摘要</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              将为所有没有摘要的章节自动生成摘要和关键词。这可能需要一些时间。
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBatchSummaryModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchGenerateSummaries}
                disabled={generatingSummaries}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {generatingSummaries && <span className="animate-spin">⚡</span>}
                {generatingSummaries ? '生成中...' : '开始生成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加章节选择卷弹窗 */}
      {showAddChapterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">添加新章节</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">选择卷（可选）</label>
                <select
                  value={newChapterVolumeId}
                  onChange={(e) => setNewChapterVolumeId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">未分卷</option>
                  {(project?.volumes || []).map(v => (
                    <option key={v.id} value={v.id}>第{v.number}卷 {v.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAddChapterModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => createChapter(newChapterVolumeId || undefined)}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

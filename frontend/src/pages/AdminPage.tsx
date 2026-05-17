import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Users, Shield, Trash2, Edit3, Key,
  Search, Crown, User as UserIcon, Mail, Calendar, BookOpen,
  FileText, ExternalLink
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import type { User } from '../types'

interface ProjectInfo {
  id: string;
  title: string;
  summary: string;
  wordCount: number;
  chapterCount: number;
  updatedAt: number;
  userId: string;
  ownerName: string;
  ownerUsername: string;
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { user, isAdmin, logout } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [activeTab, setActiveTab] = useState<'users' | 'projects'>('users')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ nickname: '', email: '', role: 'user' as 'admin' | 'user' })
  const [resetPasswordUser, setResetPasswordUser] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isAdmin) {
      navigate('/')
      return
    }
    loadData()
  }, [isAdmin])

  async function loadData() {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      
      // 加载用户
      const usersRes = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (usersRes.ok) setUsers(await usersRes.json())
      
      // 加载项目
      const projectsRes = await fetch('/api/admin/projects', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (projectsRes.ok) setProjects(await projectsRes.json())
    } catch {
      setError('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateUser(username: string) {
    setError('')
    setSuccess('')
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      setSuccess(`用户 ${username} 更新成功`)
      setEditingUser(null)
      loadData()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleResetPassword(username: string) {
    if (!newPassword || newPassword.length < 6) {
      setError('密码至少6位')
      return
    }
    setError('')
    setSuccess('')
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      setSuccess(`用户 ${username} 密码已重置`)
      setResetPasswordUser(null)
      setNewPassword('')
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDeleteUser(username: string) {
    if (!confirm(`确定要删除用户 "${username}" 吗？此操作不可恢复！`)) return
    setError('')
    setSuccess('')
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      setSuccess(`用户 ${username} 已删除`)
      loadData()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDeleteProject(projectId: string, title: string) {
    if (!confirm(`确定要删除项目 "${title}" 吗？此操作不可恢复！`)) return
    setError('')
    setSuccess('')
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      setSuccess(`项目 "${title}" 已删除`)
      loadData()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const filteredUsers = users.filter(u =>
    u && u.username && u.username.includes(search) ||
    (u && u.nickname && u.nickname.includes(search)) ||
    (u && u.email && u.email.includes(search))
  )

  const filteredProjects = projects.filter(p =>
    p && p.title && p.title.includes(search) ||
    (p && p.ownerName && p.ownerName.includes(search)) ||
    (p && p.ownerUsername && p.ownerUsername.includes(search))
  )

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }

  function formatWordCount(count: number) {
    if (count > 10000) return `${(count / 10000).toFixed(1)}万字`
    return `${count}字`
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-[#f0f7f0]">
      {/* 顶部导航 */}
      <header className="bg-white/70 backdrop-blur-sm border-b border-emerald-100/50 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">管理员后台</h1>
              <p className="text-sm text-gray-400">用户与项目管理</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm">
              <Crown className="w-4 h-4" />
              <span>{user?.nickname || user?.username}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card bg-white/80 backdrop-blur-sm border-emerald-100/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{users.length}</p>
                <p className="text-sm text-gray-500">总用户数</p>
              </div>
            </div>
          </div>
          <div className="card bg-white/80 backdrop-blur-sm border-emerald-100/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{users.filter(u => u.role === 'admin').length}</p>
                <p className="text-sm text-gray-500">管理员</p>
              </div>
            </div>
          </div>
          <div className="card bg-white/80 backdrop-blur-sm border-emerald-100/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{projects.length}</p>
                <p className="text-sm text-gray-500">总项目数</p>
              </div>
            </div>
          </div>
          <div className="card bg-white/80 backdrop-blur-sm border-emerald-100/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{formatWordCount(projects.reduce((sum, p) => sum + p.wordCount, 0))}</p>
                <p className="text-sm text-gray-500">总字数</p>
              </div>
            </div>
          </div>
        </div>

        {/* 提示消息 */}
        {error && (
          <div className="mb-4 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            {success}
          </div>
        )}

        {/* Tab 切换 */}
        <div className="flex gap-1 bg-emerald-50/80 rounded-xl p-1 mb-6 max-w-md">
          <button
            onClick={() => { setActiveTab('users'); setSearch('') }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'users'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            用户管理
          </button>
          <button
            onClick={() => { setActiveTab('projects'); setSearch('') }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'projects'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            项目管理
          </button>
        </div>

        {/* 搜索 */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-sm"
              placeholder={activeTab === 'users' ? "搜索用户名、昵称或邮箱..." : "搜索项目标题或作者..."}
            />
          </div>
        </div>

        {/* 用户列表 */}
        {activeTab === 'users' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-100/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                            u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {(u.nickname || u.username).charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{u.nickname || u.username}</p>
                            <p className="text-xs text-gray-400">{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-gray-50 text-gray-600 border border-gray-200'
                        }`}>
                          {u.role === 'admin' ? <Crown className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                          {u.role === 'admin' ? '管理员' : '普通用户'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.email || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditingUser(u.username)
                              setEditForm({ nickname: u.nickname || '', email: u.email || '', role: u.role })
                              setResetPasswordUser(null)
                            }}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setResetPasswordUser(u.username)
                              setNewPassword('')
                              setEditingUser(null)
                            }}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="重置密码"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          {u.username !== user?.username && (
                            <button
                              onClick={() => handleDeleteUser(u.username)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>没有找到用户</p>
              </div>
            )}
          </div>
        )}

        {/* 项目列表 */}
        {activeTab === 'projects' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-100/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">项目</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">作者</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">字数/章节</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">更新时间</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{p.title}</p>
                            <p className="text-xs text-gray-400 line-clamp-1">{p.summary || '暂无简介'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs">
                            {p.ownerName.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-600">{p.ownerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatWordCount(p.wordCount)} · {p.chapterCount}章
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{formatDate(p.updatedAt)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/project/${p.id}`)}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="查看项目"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(p.id, p.title)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除项目"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredProjects.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>没有找到项目</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">编辑用户 - {editingUser}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">昵称</label>
                <input
                  type="text"
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">邮箱</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">角色</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'admin' | 'user' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleUpdateUser(editingUser)}
                  className="btn-primary flex-1"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary flex-1"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 重置密码弹窗 */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setResetPasswordUser(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">重置密码 - {resetPasswordUser}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
                  placeholder="至少6位"
                  minLength={6}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleResetPassword(resetPasswordUser)}
                  className="btn-primary flex-1"
                >
                  重置密码
                </button>
                <button
                  onClick={() => setResetPasswordUser(null)}
                  className="btn-secondary flex-1"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

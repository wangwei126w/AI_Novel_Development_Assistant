import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Lock, Shield, Bell, Moon, Sun,
  Save, CheckCircle, AlertCircle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, changePassword, logout } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 6) {
      setError('新密码至少6位')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }

    setLoading(true)
    const result = await changePassword({ oldPassword, newPassword })
    setLoading(false)

    if (result) {
      setError(result)
    } else {
      setSuccess('密码修改成功，请重新登录')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        logout()
      }, 1500)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f7f0]">
      {/* 顶部导航 */}
      <header className="bg-white/70 backdrop-blur-sm border-b border-emerald-100/50 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
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
            <h1 className="text-xl font-bold text-gray-800">个人设置</h1>
            <p className="text-sm text-gray-400">管理你的账户信息</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* 用户信息卡片 */}
        <div className="card bg-white/80 backdrop-blur-sm border-emerald-100/60">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            账户信息
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">用户名</span>
              <span className="text-sm font-medium text-gray-800">{user?.username}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">昵称</span>
              <span className="text-sm font-medium text-gray-800">{user?.nickname || '-'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">邮箱</span>
              <span className="text-sm font-medium text-gray-800">{user?.email || '-'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">角色</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                user?.role === 'admin'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-gray-50 text-gray-600 border border-gray-200'
              }`}>
                {user?.role === 'admin' ? '管理员' : '普通用户'}
              </span>
            </div>
          </div>
        </div>

        {/* 修改密码 */}
        <div className="card bg-white/80 backdrop-blur-sm border-emerald-100/60">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            修改密码
          </h2>

          {error && (
            <div className="mb-4 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">原密码</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="input-field"
                placeholder="请输入当前密码"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                placeholder="至少6位"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">确认新密码</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="再次输入新密码"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              修改密码
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

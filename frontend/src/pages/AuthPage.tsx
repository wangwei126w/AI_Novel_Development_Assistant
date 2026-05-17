import { useState } from 'react'
import { BookOpen, Eye, EyeOff, User, Lock, Mail, Sparkles, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = isLogin
        ? await login({ username, password })
        : await register({ username, password, nickname, email })

      if (!success) {
        setError(isLogin ? '用户名或密码错误' : '注册失败，用户名可能已存在')
      }
    } catch (err) {
      setError('网络错误，请检查连接')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f7f0] flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-green-200/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-100/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">AI 长篇小说写作助手</h1>
          <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            智能辅助，让创作更流畅
          </p>
        </div>

        {/* 卡片 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-emerald-100/50 border border-emerald-100/50 p-8">
          {/* 切换标签 */}
          <div className="flex gap-1 bg-emerald-50/80 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError('') }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                isLogin
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError('') }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                !isLogin
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">用户名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all text-sm"
                  placeholder="请输入用户名"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* 昵称（仅注册） */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">昵称</label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all text-sm"
                    placeholder="给自己起个名字"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* 邮箱（仅注册） */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">邮箱（可选）</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all text-sm"
                    placeholder="your@email.com"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all text-sm"
                  placeholder="请输入密码"
                  required
                  minLength={6}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? '登录' : '注册'
              )}
            </button>
          </form>

          {/* 底部提示 */}
          <p className="text-center text-xs text-gray-400 mt-6">
            {isLogin ? '还没有账号？' : '已有账号？'}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError('') }}
              className="text-emerald-600 hover:text-emerald-700 font-medium ml-1"
            >
              {isLogin ? '立即注册' : '去登录'}
            </button>
          </p>
        </div>

        {/* 底部版权 */}
        <p className="text-center text-xs text-gray-400 mt-6">
          AI 长篇小说写作助手 · 专注创作
        </p>
      </div>
    </div>
  )
}

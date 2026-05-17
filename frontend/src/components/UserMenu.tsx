import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, Settings, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function UserMenu() {
  const navigate = useNavigate()
  const { user, logout, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition-all"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {(user.nickname || user.username).charAt(0)}
        </div>
        <span className="text-sm font-medium text-gray-700 hidden sm:block">
          {user.nickname || user.username}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg shadow-emerald-100/50 border border-emerald-100 py-1 z-50 min-w-[180px]">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-800">{user.nickname || user.username}</p>
              <p className="text-xs text-gray-400">{user.email || user.username}</p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                  <Shield className="w-3 h-3" />
                  管理员
                </span>
              )}
            </div>

            <button
              onClick={() => { navigate('/settings'); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              个人设置
            </button>

            {isAdmin && (
              <button
                onClick={() => { navigate('/admin'); setOpen(false) }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-amber-600" />
                管理员后台
              </button>
            )}

            <div className="border-t border-gray-100 mt-1" />

            <button
              onClick={() => { logout(); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </>
      )}
    </div>
  )
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { User, AuthState, LoginCredentials, RegisterCredentials, ChangePasswordData } from '../types'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>
  register: (credentials: RegisterCredentials) => Promise<boolean>
  logout: () => void
  updateUser: (user: Partial<User>) => void
  changePassword: (data: ChangePasswordData) => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

const API_BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

function setToken(token: string) {
  localStorage.setItem('auth_token', token)
}

function removeToken() {
  localStorage.removeItem('auth_token')
}

function buildState(user: User | null, token: string | null, isLoading: boolean): AuthState {
  return {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    isAdmin: user?.role === 'admin',
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    buildState(null, getToken(), true)
  )

  // 初始化时验证 token
  useEffect(() => {
    const token = getToken()
    if (token) {
      verifyToken(token)
    } else {
      setState(buildState(null, null, false))
    }
  }, [])

  async function verifyToken(token: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const user = await res.json()
        setState(buildState(user, token, false))
      } else {
        removeToken()
        setState(buildState(null, null, false))
      }
    } catch {
      removeToken()
      setState(buildState(null, null, false))
    }
  }

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '登录失败')
      }
      const { token, user } = await res.json()
      setToken(token)
      setState(buildState(user, token, false))
      return true
    } catch (e) {
      console.error('Login error:', e)
      return false
    }
  }, [])

  const register = useCallback(async (credentials: RegisterCredentials): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '注册失败')
      }
      const { token, user } = await res.json()
      setToken(token)
      setState(buildState(user, token, false))
      return true
    } catch (e) {
      console.error('Register error:', e)
      return false
    }
  }, [])

  const logout = useCallback(() => {
    removeToken()
    setState(buildState(null, null, false))
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setState(s => s.user ? buildState({ ...s.user, ...updates }, s.token, false) : s)
  }, [])

  const changePassword = useCallback(async (data: ChangePasswordData): Promise<string | null> => {
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        return err.error || '修改失败'
      }
      return null
    } catch {
      return '网络错误'
    }
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

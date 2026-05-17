import { useState, useCallback } from 'react';

const API_BASE = '/api';

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async <T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        ...options,
      });
      
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        throw new Error('登录已过期，请重新登录');
      }
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '请求失败');
      }
      
      return await response.json();
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
}

export async function fetchProjects() {
  const res = await fetch('/api/projects', {
    headers: { ...getAuthHeaders() },
  });
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
    throw new Error('登录已过期');
  }
  return res.json();
}

export async function createProject(title: string, summary?: string) {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ title, summary }),
  });
  return res.json();
}

export async function getProject(id: string) {
  const res = await fetch(`/api/projects/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function updateProject(id: string, data: any) {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteProject(id: string) {
  await fetch(`/api/projects/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
}

export async function aiWrite(params: {
  projectId: string;
  chapterId: string;
  mode: string;
  prompt?: string;
  style?: string;
}) {
  const res = await fetch('/api/ai/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function aiSummarize(content: string) {
  const res = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ content }),
  });
  return res.json();
}

export async function checkConsistency(projectId: string, content: string) {
  const res = await fetch('/api/ai/check-consistency', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ projectId, content }),
  });
  return res.json();
}

// 导出功能
export function exportProject(projectId: string, format: 'txt' | 'docx') {
  const token = localStorage.getItem('auth_token');
  const url = `/api/projects/${projectId}/export/${format}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  window.open(url, '_blank');
}

// 全文搜索
export async function searchProject(projectId: string, keyword: string) {
  const res = await fetch(`/api/projects/${projectId}/search?q=${encodeURIComponent(keyword)}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

// 写作统计
export async function getProjectStats(projectId: string) {
  const res = await fetch(`/api/projects/${projectId}/stats`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

// 批量生成章节摘要
export async function generateSummaries(projectId: string) {
  const res = await fetch('/api/ai/generate-summaries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ projectId }),
  });
  return res.json();
}

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, User, Edit2, Check, X } from 'lucide-react'
import { Character } from '../types'

interface CharacterPanelProps {
  characters: Character[]
  onUpdate: (characters: Character[]) => void
}

export default function CharacterPanel({ characters, onUpdate }: CharacterPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newCharacter, setNewCharacter] = useState<Partial<Character>>({})

  const handleAdd = () => {
    if (!newCharacter.name?.trim()) return
    
    const character: Character = {
      id: Date.now().toString(36),
      name: newCharacter.name,
      description: newCharacter.description || '',
      appearance: newCharacter.appearance || '',
      personality: newCharacter.personality || '',
      background: newCharacter.background || '',
      goals: newCharacter.goals || '',
    }
    
    onUpdate([...characters, character])
    setNewCharacter({})
    setShowNewForm(false)
  }

  const handleUpdate = (id: string, updates: Partial<Character>) => {
    onUpdate(characters.map(c => c.id === id ? { ...c, ...updates } : c))
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    if (!confirm('确定删除这个角色吗？')) return
    onUpdate(characters.filter(c => c.id !== id))
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-primary-600" />
            角色管理
          </h2>
          <button
            onClick={() => setShowNewForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加角色
          </button>
        </div>

        {showNewForm && (
          <div className="card mb-6">
            <h3 className="font-semibold mb-4">新建角色</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                <input
                  type="text"
                  value={newCharacter.name || ''}
                  onChange={e => setNewCharacter({ ...newCharacter, name: e.target.value })}
                  className="input-field"
                  placeholder="角色姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">外貌</label>
                <input
                  type="text"
                  value={newCharacter.appearance || ''}
                  onChange={e => setNewCharacter({ ...newCharacter, appearance: e.target.value })}
                  className="input-field"
                  placeholder="外貌特征"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">简介</label>
                <textarea
                  value={newCharacter.description || ''}
                  onChange={e => setNewCharacter({ ...newCharacter, description: e.target.value })}
                  className="input-field h-20 resize-none"
                  placeholder="角色简介..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">性格</label>
                <input
                  type="text"
                  value={newCharacter.personality || ''}
                  onChange={e => setNewCharacter({ ...newCharacter, personality: e.target.value })}
                  className="input-field"
                  placeholder="性格特点"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">背景</label>
                <input
                  type="text"
                  value={newCharacter.background || ''}
                  onChange={e => setNewCharacter({ ...newCharacter, background: e.target.value })}
                  className="input-field"
                  placeholder="人物背景"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">目标/动机</label>
                <input
                  type="text"
                  value={newCharacter.goals || ''}
                  onChange={e => setNewCharacter({ ...newCharacter, goals: e.target.value })}
                  className="input-field"
                  placeholder="角色的目标和动机"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleAdd} className="btn-primary">创建</button>
              <button onClick={() => setShowNewForm(false)} className="btn-secondary">取消</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map(character => (
            <div key={character.id} className="card">
              {editingId === character.id ? (
                <CharacterEditForm
                  character={character}
                  onSave={(updates) => handleUpdate(character.id, updates)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{character.name}</h3>
                      {character.appearance && (
                        <p className="text-sm text-gray-500">{character.appearance}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingId(character.id)}
                        className="p-1 text-gray-400 hover:text-primary-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(character.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {character.description && (
                    <p className="text-gray-700 text-sm mb-2">{character.description}</p>
                  )}
                  
                  <div className="space-y-1 text-sm">
                    {character.personality && (
                      <p><span className="text-gray-500">性格：</span>{character.personality}</p>
                    )}
                    {character.background && (
                      <p><span className="text-gray-500">背景：</span>{character.background}</p>
                    )}
                    {character.goals && (
                      <p><span className="text-gray-500">目标：</span>{character.goals}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {characters.length === 0 && !showNewForm && (
          <div className="text-center py-12 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>还没有角色，点击上方按钮添加</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CharacterEditForm({ character, onSave, onCancel }: {
  character: Character
  onSave: (updates: Partial<Character>) => void
  onCancel: () => void
}) {
  // 使用本地状态，避免每次输入都触发父组件更新
  const [form, setForm] = useState(character)
  const [localDescription, setLocalDescription] = useState(character.description || '')

  // 同步外部状态到本地
  useEffect(() => {
    setForm(character)
    setLocalDescription(character.description || '')
  }, [character])

  // 处理描述更新（防抖）
  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value)
    setForm({ ...form, description: value })
  }

  // 保存时合并本地状态
  const handleSave = () => {
    onSave({ ...form, description: localDescription })
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={form.name}
        onChange={e => setForm({ ...form, name: e.target.value })}
        className="input-field font-semibold"
        placeholder="姓名"
      />
      <input
        type="text"
        value={form.appearance || ''}
        onChange={e => setForm({ ...form, appearance: e.target.value })}
        className="input-field text-sm"
        placeholder="外貌"
      />
      <textarea
        value={localDescription}
        onChange={e => handleDescriptionChange(e.target.value)}
        className="input-field h-20 resize-none text-sm"
        placeholder="简介"
      />
      <input
        type="text"
        value={form.personality || ''}
        onChange={e => setForm({ ...form, personality: e.target.value })}
        className="input-field text-sm"
        placeholder="性格"
      />
      <input
        type="text"
        value={form.background || ''}
        onChange={e => setForm({ ...form, background: e.target.value })}
        className="input-field text-sm"
        placeholder="背景"
      />
      <input
        type="text"
        value={form.goals || ''}
        onChange={e => setForm({ ...form, goals: e.target.value })}
        className="input-field text-sm"
        placeholder="目标"
      />
      <div className="flex gap-2">
        <button onClick={handleSave} className="btn-primary text-sm py-1.5">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={onCancel} className="btn-secondary text-sm py-1.5">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

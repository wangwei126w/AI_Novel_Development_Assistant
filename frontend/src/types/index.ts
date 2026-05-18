export * from './auth'

export interface Character {
  id: string;
  name: string;
  description: string;
  appearance?: string;
  personality?: string;
  background?: string;
  goals?: string;
  relationships?: Relationship[];
}

export interface Relationship {
  characterId: string;
  characterName: string;
  type: string;
  description: string;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  content: string;
  summary?: string;
  keywords?: string[];
  wordCount: number;
  createdAt: number;
  updatedAt: number;
  locked?: boolean;
  volumeId?: string; // 所属卷ID
}

export interface Volume {
  id: string;
  number: number;
  title: string;
  summary?: string;
  chapterIds: string[]; // 包含的章节ID列表
  createdAt: number;
}

export interface WorldSettings {
  background: string;
  rules: string;
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  time: string;
  event: string;
  description?: string;
}

export interface PlotOutline {
  id: string;
  title: string;
  content: string;
  chapterRange?: [number, number];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: number;
}

export interface Project {
  id: string;
  title: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
  wordCount: number;
  chapters: Chapter[];
  characters: Character[];
  worldSettings: WorldSettings;
  plotOutlines: PlotOutline[];
  notes: Note[];
  volumes?: Volume[]; // 卷列表
  locked?: boolean;
  coverImage?: string; // 封面图片URL
}

export type WriteMode = 'continue' | 'rewrite' | 'dialogue' | 'outline' | 'custom';

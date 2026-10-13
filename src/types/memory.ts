export type MemoryCategory = 'architecture' | 'learning' | 'preference' | 'solution' | 'constraint';

export interface MemoryInsight {
  id: string;
  category: MemoryCategory;
  title: string;
  detail: string;
  tags: string[];
  confidence: number; // 0-100%
  createdAt: string;
  updatedAt: string;
}

export interface PromptEngineeringConfig {
  chainOfThought: boolean;
  negativeConstraints: boolean;
  reflexionSelfCorrection: boolean;
  seniorExpertMode: boolean;
  preferredStack?: string;
  rolePersona?: string;
}

export interface GladosPersistentMemory {
  version: string;
  lastSync: string;
  userProfile: {
    name: string;
    level: 'senior' | 'principal' | 'architect';
    primaryLanguages: string[];
    hardwareProfile: string;
  };
  promptConfig: PromptEngineeringConfig;
  insights: MemoryInsight[];
  recentLearnings: string[];
  activeContextThread: {
    currentObjective: string;
    unresolvedDoubts: string[];
    provenSolutions: string[];
  };
  metaPromptTemplate: string;
}

export interface RAGSearchResult {
  insight: MemoryInsight;
  score: number; // 0-100%
  matchedTerms: string[];
  highlightSnippet: string;
}

export interface LearningSuggestion {
  id: string;
  title: string;
  detail: string;
  category: MemoryCategory;
  confidence: number;
  tags: string[];
  sourceMessageId?: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

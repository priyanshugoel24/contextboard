// Consolidated Search Interfaces

// Search result type
export type SearchResult = {
  type: "card" | "project" | "member" | "tag" | "team";
  id: string;
  originalId?: string;
  title?: string;
  name?: string;
  email?: string;
  tag?: string;
  projectId?: string;
  projectSlug?: string;
  slug?: string;
  projectName?: string;
  teamName?: string;
  teamSlug?: string;
  description?: string;
  projectCount?: number;
};

// Interface for project data used in fuzzy search
export interface ProjectSearchData {
  id: string;
  name: string;
  slug: string;
  teamName?: string;
}

// Interface for team data used in fuzzy search
export interface TeamSearchData {
  id: string;
  name: string;
  slug: string;
}

// Interface for Fuse.js search results
export interface FuseSearchResult<T> {
  item: T;
  score?: number;
  refIndex: number;
}

// Interfaces for relevant project and team matches
export interface RelevantProject {
  project: ProjectSearchData;
  score: number;
  reason: string;
}

export interface RelevantTeam {
  team: TeamSearchData;
  score: number;
  reason: string;
}

// Searchable item interface
export interface SearchableItem {
  id: string;
  type: string;
  content: string;
  metadata?: {
    [key: string]: unknown;
  };
}

// Filter and sort options
export interface FilterOptions {
  type?: string[];
  status?: string[];
  visibility?: string[];
  assignedTo?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface SortOptions {
  field: 'createdAt' | 'updatedAt' | 'title' | 'status';
  direction: 'asc' | 'desc';
}
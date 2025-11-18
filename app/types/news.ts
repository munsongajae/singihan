export interface Article {
  title: string;
  link: string;
  summary?: string;
  matched?: boolean;
}

export interface ScrapeResult {
  [page: string]: Article[];
}

export interface Preset {
  id: string;
  name: string;
  pressIds: string[];
  createdAt: number;
}

export interface NaverNewsItem {
  title: string;
  link: string;
  originallink: string;
  description: string;
  pubDate: string;
}

export interface NaverNewsSearchResult {
  total: number;
  start: number;
  display: number;
  items: NaverNewsItem[];
}


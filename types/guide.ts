export type Category = 'Academics' | 'Social Life' | 'Budgeting' | 'Safety';

export interface Guide {
  id: string;
  category: Category;
  title: string;
  description: string;
  content?: string;
  readTime?: string;
  likes?: number;
}

export interface GuidesResponse {
  data: Guide[];
  total: number;
  page: number;
  limit: number;
}

export interface LikeResponse {
  success: boolean;
  likes: number;
}
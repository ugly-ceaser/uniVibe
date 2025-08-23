export type Category = 'Academics' | 'Social Life' | 'Budgeting' | 'Safety';

export interface Guide {
  id: string;
  title: string;
  content: string;
  description?: string;
  category: Category;
  readTime: string;
  likes: number;
  author?: string;
  createdAt: string;
  status: 'Draft' | 'Cleared' | 'Published';
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
  isLiked: boolean;
}
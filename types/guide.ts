export type Category = string;

export interface Guide {
  id: string;
  title: string;
  content: string;
  description?: string;
  category: Category;
  readTime: string;
  likes: number;
  isLiked: boolean;
  author: string;
  createdAt: string;
  status: string;
  isFeatured?: boolean;
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

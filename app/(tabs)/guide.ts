export type Category = 'Academics' | 'Social Life' | 'Budgeting' | 'Safety';

export interface Guide {
  id: string;
  category: Category;
  title: string;
  description: string;
  readTime?: string;
  likes?: number;
}
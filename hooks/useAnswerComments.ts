import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forumApi, useApi, ForumComment } from '@/utils/api';

export function useAnswerComments(answerId: string, page = 1, pageSize = 20) {
  const api = useApi();
  const client = useMemo(() => forumApi(api), [api]);

  const query = useQuery({
    queryKey: ['answer-comments', answerId, page, pageSize],
    queryFn: async () => {
      const res = await client.getComments({ answerId, page, pageSize });
      return res.data;
    },
    enabled: !!answerId,
    staleTime: 30_000,
  });

  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (payload: { body: string; parentId?: string }) => {
      const res = await client.createComment({ answerId, ...payload });
      return res.data as ForumComment;
    },
    onSuccess: (created) => {
      qc.setQueryData<any>(['answer-comments', answerId, page, pageSize], (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: [...prev.items, created],
          totalCount: (prev.totalCount ?? 0) + 1,
        };
      });
    },
  });

  return { query, create };
}
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface UploadTask {
  id: string;
  courseId: string;
  courseCode?: string;
  fileName: string;
  fileSize?: number;
  progress: number; // 0 to 100
  status: 'uploading' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

interface FileAsset {
  uri: string;
  name: string;
  mimeType: string;
  webFile?: any;
}

interface UploadContextType {
  tasks: UploadTask[];
  activeTask: UploadTask | null;
  startUpload: (
    courseId: string,
    courseCode: string,
    fileAsset: FileAsset,
    uploadFn: (
      courseId: string,
      fileAsset: FileAsset,
      onProgress: (pct: number) => void
    ) => Promise<any>
  ) => Promise<void>;
  cancelUpload: (taskId: string) => void;
  dismissTask: (taskId: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const activeTask = useMemo(() => {
    return tasks.find(t => t.status === 'uploading' || t.status === 'processing') || tasks[tasks.length - 1] || null;
  }, [tasks]);

  const dismissTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const cancelUpload = useCallback((taskId: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId
          ? { ...t, status: 'error', errorMessage: 'Upload cancelled by user.' }
          : t
      )
    );
  }, []);

  const startUpload = useCallback(
    async (
      courseId: string,
      courseCode: string,
      fileAsset: FileAsset,
      uploadFn: (
        courseId: string,
        fileAsset: FileAsset,
        onProgress: (pct: number) => void
      ) => Promise<any>
    ) => {
      const taskId = `upload-${Date.now()}`;
      const newTask: UploadTask = {
        id: taskId,
        courseId,
        courseCode,
        fileName: fileAsset.name,
        progress: 0,
        status: 'uploading',
      };

      setTasks(prev => [...prev, newTask]);

      try {
        await uploadFn(courseId, fileAsset, (pct: number) => {
          setTasks(prev =>
            prev.map(t =>
              t.id === taskId
                ? {
                    ...t,
                    progress: pct,
                    status: pct >= 100 ? 'processing' : 'uploading',
                  }
                : t
            )
          );
        });

        setTasks(prev =>
          prev.map(t =>
            t.id === taskId
              ? { ...t, progress: 100, status: 'completed' }
              : t
          )
        );
      } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        setTasks(prev =>
          prev.map(t =>
            t.id === taskId
              ? { ...t, status: 'error', errorMessage: errorMsg }
              : t
          )
        );
      }
    },
    []
  );

  const value = useMemo(
    () => ({
      tasks,
      activeTask,
      startUpload,
      cancelUpload,
      dismissTask,
    }),
    [tasks, activeTask, startUpload, cancelUpload, dismissTask]
  );

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
}

export function useUpload(): UploadContextType {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}

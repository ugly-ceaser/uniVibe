import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { UploadCloud, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react-native';
import { useUpload } from '@/contexts/UploadContext';

export function GlobalUploadToast(): React.JSX.Element | null {
  const { activeTask, dismissTask } = useUpload();
  const router = useRouter();

  if (!activeTask) return null;

  const isCompleted = activeTask.status === 'completed';
  const isError = activeTask.status === 'error';
  const isUploading = activeTask.status === 'uploading' || activeTask.status === 'processing';

  const handleOpenCourse = () => {
    if (activeTask.courseId) {
      router.push({
        pathname: '/course-detail',
        params: { id: activeTask.courseId, courseCode: activeTask.courseCode },
      });
      dismissTask(activeTask.id);
    }
  };

  return (
    <View style={styles.toastContainer}>
      <View style={[styles.card, isCompleted ? styles.completedCard : isError ? styles.errorCard : styles.uploadingCard]}>
        <View style={styles.headerRow}>
          <View style={styles.iconBadge}>
            {isCompleted ? (
              <CheckCircle2 size={18} color="#C4FF0E" />
            ) : isError ? (
              <AlertCircle size={18} color="#FF8A80" />
            ) : (
              <UploadCloud size={18} color="#C4FF0E" />
            )}
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.fileName} numberOfLines={1}>
              {activeTask.fileName}
            </Text>
            <Text style={styles.statusText}>
              {isCompleted
                ? `Uploaded to ${activeTask.courseCode || 'course'}`
                : isError
                ? activeTask.errorMessage || 'Upload failed'
                : activeTask.status === 'processing'
                ? 'Indexing notes & vector storage...'
                : `Uploading... ${activeTask.progress}%`}
            </Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={() => dismissTask(activeTask.id)}>
            <X size={16} color="#AAAAC0" />
          </TouchableOpacity>
        </View>

        {isUploading ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${Math.max(5, activeTask.progress)}%` }]} />
          </View>
        ) : null}

        {isCompleted ? (
          <TouchableOpacity style={styles.actionBtn} onPress={handleOpenCourse}>
            <Text style={styles.actionBtnText}>View in course materials</Text>
            <ArrowRight size={14} color="#111" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  card: {
    backgroundColor: '#1E1E30',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  uploadingCard: {
    borderColor: '#3A3A55',
  },
  completedCard: {
    borderColor: '#C4FF0E',
    backgroundColor: '#162210',
  },
  errorCard: {
    borderColor: '#FF8A80',
    backgroundColor: '#2A181A',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  fileName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statusText: {
    color: '#AAAAC0',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#2A2A40',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#C4FF0E',
    borderRadius: 2,
  },
  actionBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#C4FF0E',
    paddingVertical: 7,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#111',
    fontSize: 12,
    fontWeight: '800',
  },
});

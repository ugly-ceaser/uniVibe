import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { X, ExternalLink, FileText, Download, Share2, Calendar, HardDrive } from 'lucide-react-native';
import type { CourseMaterial } from '@/types/course';

interface MaterialViewerModalProps {
  visible: boolean;
  material: CourseMaterial | null;
  onClose: () => void;
}

const formatSize = (bytes?: number): string => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'Recently uploaded';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 'Recently uploaded';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export function MaterialViewerModal({
  visible,
  material,
  onClose,
}: MaterialViewerModalProps): React.JSX.Element | null {
  if (!material) return null;

  const ext = (material.name.split('.').pop() || 'FILE').toUpperCase();

  const handleOpenExternal = async () => {
    if (!material.url) {
      Alert.alert('Download unavailable', 'No direct URL is available for this material.');
      return;
    }
    try {
      await Linking.openURL(material.url);
    } catch {
      Alert.alert('Cannot open file', 'Unable to open file in external browser.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.extBadge}>
                <Text style={styles.extText}>{ext.slice(0, 4)}</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {material.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#AAAAC0" />
            </TouchableOpacity>
          </View>

          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <HardDrive size={14} color="#8D8DA8" />
              <Text style={styles.metaText}>{formatSize(material.sizeBytes)}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaRow}>
              <Calendar size={14} color="#8D8DA8" />
              <Text style={styles.metaText}>{formatDate(material.uploadedAt)}</Text>
            </View>
          </View>

          <View style={styles.previewPlaceholder}>
            <FileText size={48} color="#C4FF0E" />
            <Text style={styles.previewTitle}>{material.name}</Text>
            <Text style={styles.previewSub}>
              Course material ready for reading & AI tutoring context.
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.primaryActionBtn} onPress={handleOpenExternal}>
              <ExternalLink size={16} color="#111" />
              <Text style={styles.primaryActionText}>Open File / Download</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1E1E30',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#3A3A55',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  extBadge: {
    backgroundColor: '#C4FF0E',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  extText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111',
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  closeBtn: {
    padding: 6,
  },
  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252540',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#AAAAC0',
    fontSize: 12,
    fontWeight: '600',
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#3A3A55',
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161625',
    borderRadius: 16,
    padding: 28,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#2A2A42',
  },
  previewTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  previewSub: {
    color: '#8D8DA8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  actionsRow: {
    marginTop: 20,
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C4FF0E',
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryActionText: {
    color: '#111',
    fontSize: 14,
    fontWeight: '900',
  },
});

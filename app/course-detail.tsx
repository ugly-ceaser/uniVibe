import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CourseAIChat from '@/components/CourseAIChat';
import type { Course, CourseMaterial } from '@/types/course';
import { courseMaterialsApi, coursesApi, useApi } from '@/utils/api';

type TabKey = 'chat' | 'materials';
type LoadState = 'loading' | 'ready' | 'error';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Please try again.';

const formatSize = (size?: number): string => {
  if (!size || size < 0) return 'Size unavailable';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value?: string): string => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

function MaterialRow({
  material,
  onOpen,
}: {
  material: CourseMaterial;
  onOpen: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.materialRow}
      onPress={onOpen}
      activeOpacity={0.8}
      accessibilityLabel={`Open ${material.name}`}
    >
      <View style={styles.fileIcon}>
        <FileText size={21} color='#111' />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={2}>
          {material.name}
        </Text>
        <Text style={styles.fileMeta}>
          {formatSize(material.sizeBytes)} · {formatDate(material.uploadedAt)}
        </Text>
      </View>
      <Text style={styles.openLabel}>Open</Text>
    </TouchableOpacity>
  );
}

export default function CourseDetailScreen() {
  const api = useApi();
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId?: string | string[] }>();
  const courseId = Array.isArray(params.courseId)
    ? params.courseId[0]
    : params.courseId;
  const courseClient = useMemo(() => coursesApi(api), [api]);
  const materialsClient = useMemo(() => courseMaterialsApi(api), [api]);

  const [course, setCourse] = useState<Course | null>(null);
  const [courseState, setCourseState] = useState<LoadState>('loading');
  const [courseError, setCourseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('chat');
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [materialsState, setMaterialsState] = useState<LoadState>('loading');
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadCourse = useCallback(async () => {
    if (!courseId) {
      setCourse(null);
      setCourseError('No course was selected.');
      setCourseState('error');
      return;
    }
    setCourseState('loading');
    setCourseError(null);
    try {
      const response = await courseClient.getById(courseId);
      if (!response.data.id) throw new Error('Course not found.');
      setCourse(response.data);
      setCourseState('ready');
    } catch (error) {
      setCourse(null);
      setCourseError(errorMessage(error));
      setCourseState('error');
    }
  }, [courseClient, courseId]);

  const loadMaterials = useCallback(async () => {
    if (!courseId) return;
    setMaterialsState('loading');
    setMaterialsError(null);
    try {
      const response = await materialsClient.list(courseId);
      setMaterials(response.data);
      setMaterialsState('ready');
    } catch (error) {
      setMaterials([]);
      setMaterialsError(errorMessage(error));
      setMaterialsState('error');
    }
  }, [courseId, materialsClient]);

  useEffect(() => {
    void loadCourse();
    void loadMaterials();
  }, [loadCourse, loadMaterials]);

  const filteredMaterials = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return materials;
    return materials.filter(material =>
      material.name.toLowerCase().includes(query)
    );
  }, [materials, searchQuery]);

  const openMaterial = useCallback(async (material: CourseMaterial) => {
    if (!material.url) {
      Alert.alert(
        'File unavailable',
        'This material does not include a download link.'
      );
      return;
    }
    try {
      await Linking.openURL(material.url);
    } catch {
      Alert.alert('Could not open file', 'Check the link and try again.');
    }
  }, []);

  const uploadMaterial = useCallback(async () => {
    if (!courseId || uploading) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      setUploading(true);
      await materialsClient.upload(courseId, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || 'application/octet-stream',
        webFile: asset.file,
      });
      await loadMaterials();
      Alert.alert('Upload complete', `${asset.name} is now available.`);
    } catch (error) {
      setMaterialsError(`Upload failed. ${errorMessage(error)}`);
    } finally {
      setUploading(false);
    }
  }, [courseId, loadMaterials, materialsClient, uploading]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/courses');
    }
  }, [router]);

  if (courseState === 'loading') {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.centerState}>
          <ActivityIndicator size='large' color='#C4FF0E' />
          <Text style={styles.stateTitle}>Loading course…</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (courseState === 'error' || !course) {
    return (
      <View style={styles.screen}>
        <SafeAreaView style={styles.centerState}>
          <Text style={styles.stateTitle}>Course could not be loaded</Text>
          <Text style={styles.stateText}>{courseError}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBack}
            >
              <Text style={styles.secondaryButtonText}>Go back</Text>
            </TouchableOpacity>
            {courseId ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={loadCourse}
              >
                <RefreshCw size={16} color='#111' />
                <Text style={styles.primaryButtonText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole='button'
            accessibilityLabel='Go back'
          >
            <ArrowLeft size={20} color='#fff' />
          </TouchableOpacity>
          <View style={styles.courseIcon}>
            <BookOpen size={21} color='#111' />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.courseCode}>{course.courseCode}</Text>
            <Text style={styles.courseTitle} numberOfLines={1}>
              {course.title}
            </Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {(['chat', 'materials'] as TabKey[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={styles.tabButton}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab ? styles.activeTabText : null,
                ]}
              >
                {tab === 'chat' ? 'AI tutor' : 'Materials'}
              </Text>
              {activeTab === tab ? <View style={styles.tabUnderline} /> : null}
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'chat' ? (
          <CourseAIChat course={course} />
        ) : (
          <View style={styles.materialsContainer}>
            <View style={styles.searchBar}>
              <Search size={16} color='#777' />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder='Search materials…'
                placeholderTextColor='#666'
              />
            </View>

            {materialsState === 'loading' ? (
              <View style={styles.centerState}>
                <ActivityIndicator size='large' color='#C4FF0E' />
                <Text style={styles.stateTitle}>Loading materials…</Text>
              </View>
            ) : materialsState === 'error' ? (
              <View style={styles.centerState}>
                <Text style={styles.stateTitle}>Materials are unavailable</Text>
                <Text style={styles.stateText}>{materialsError}</Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={loadMaterials}
                >
                  <RefreshCw size={16} color='#111' />
                  <Text style={styles.primaryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {materialsError ? (
                  <Text style={styles.inlineError}>{materialsError}</Text>
                ) : null}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.materialsList}
                >
                  {filteredMaterials.length ? (
                    filteredMaterials.map(material => (
                      <MaterialRow
                        key={material.id}
                        material={material}
                        onOpen={() => openMaterial(material)}
                      />
                    ))
                  ) : (
                    <View style={styles.emptyMaterials}>
                      <FileText size={30} color='#77778F' />
                      <Text style={styles.emptyTitle}>
                        {searchQuery.trim()
                          ? 'No matching materials'
                          : 'No course materials yet'}
                      </Text>
                      <Text style={styles.stateText}>
                        {searchQuery.trim()
                          ? 'Try a different file name.'
                          : 'Upload the first file for this course.'}
                      </Text>
                    </View>
                  )}
                </ScrollView>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={uploadMaterial}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size='small' color='#111' />
                  ) : (
                    <Upload size={18} color='#111' />
                  )}
                  <Text style={styles.uploadButtonText}>
                    {uploading ? 'Uploading…' : 'Upload material'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#1A1A2E' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A45',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#2A2A45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#C4FF0E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  courseCode: { color: '#C4FF0E', fontSize: 11, fontWeight: '900' },
  courseTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A45',
  },
  tabButton: { marginRight: 26, paddingVertical: 13 },
  tabText: { color: '#77778F', fontSize: 14, fontWeight: '700' },
  activeTabText: { color: '#fff' },
  tabUnderline: {
    position: 'absolute',
    height: 3,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 2,
    backgroundColor: '#C4FF0E',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  stateTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 12 },
  stateText: {
    color: '#AAAAC0',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 7,
  },
  errorActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryButton: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#C4FF0E',
  },
  primaryButtonText: { color: '#111', fontWeight: '800' },
  secondaryButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#55556F',
  },
  secondaryButtonText: { color: '#fff', fontWeight: '800' },
  materialsContainer: { flex: 1, paddingHorizontal: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 14,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3A3A55',
    backgroundColor: '#252540',
  },
  searchInput: { flex: 1, color: '#fff', paddingVertical: 11, fontSize: 14 },
  materialsList: { paddingBottom: 95, flexGrow: 1 },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    marginBottom: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#3A3A55',
    backgroundColor: '#252540',
  },
  fileIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#C4FF0E',
  },
  fileInfo: { flex: 1 },
  fileName: { color: '#fff', fontSize: 14, lineHeight: 19, fontWeight: '700' },
  fileMeta: { color: '#8D8DA8', fontSize: 11, marginTop: 4 },
  openLabel: { color: '#C4FF0E', fontSize: 12, fontWeight: '800' },
  emptyMaterials: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 12 },
  inlineError: {
    color: '#FF8A80',
    backgroundColor: '#3A2535',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    fontSize: 12,
  },
  uploadButton: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 24,
    backgroundColor: '#C4FF0E',
  },
  uploadButtonText: { color: '#111', fontSize: 14, fontWeight: '900' },
});

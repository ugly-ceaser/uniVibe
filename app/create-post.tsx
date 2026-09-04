import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Sparkles, Hash } from 'lucide-react-native';
import { forumApi, useApi } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { lightTheme } from '@/constants/theme';

type CategoryEnum =
  | 'GENERAL_DISCUSSION'
  | 'ACADEMIC_HELP'
  | 'STUDENT_LIFE'
  | 'CAREER_AND_INTERNSHIPS'
  | 'TECH_AND_PROGRAMMING'
  | 'CAMPUS_SERVICES';

const CATEGORY_OPTIONS: { id: CategoryEnum; label: string; emoji: string }[] = [
  { id: 'GENERAL_DISCUSSION', label: 'General', emoji: '💡' },
  { id: 'ACADEMIC_HELP', label: 'Academic help', emoji: '📖' },
  { id: 'STUDENT_LIFE', label: 'Student life', emoji: '🎒' },
  { id: 'CAREER_AND_INTERNSHIPS', label: 'Career', emoji: '💼' },
  { id: 'TECH_AND_PROGRAMMING', label: 'Tech', emoji: '💻' },
  { id: 'CAMPUS_SERVICES', label: 'Campus services', emoji: '🏫' },
];

const SUGGESTED_TAGS = [
  '#Exams',
  '#CourseRegistration',
  '#Assignments',
  '#CampusLife',
  '#Housing',
  '#Internships',
  '#Advice',
];

const TITLE_MAX = 100;
const BODY_MAX = 600;

export default function CreatePostScreen() {
  const router = useRouter();
  const api = useApi();
  const { user } = useAuth();
  const client = useMemo(() => forumApi(api), [api]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<CategoryEnum>('GENERAL_DISCUSSION');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Fast compose: only question title (min 4 chars) is strictly required!
  const canSubmit = title.trim().length >= 4;

  const showToast = (type: 'success' | 'error', message: string, ms = 2000) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/forum');
    }
  };

  const submit = async () => {
    if (!canSubmit) {
      showToast('error', 'Please enter your question (min 4 characters).');
      return;
    }
    setSubmitting(true);

    try {
      const finalBody =
        body.trim() ||
        (selectedTags.length > 0
          ? `${title.trim()}\n\nTags: ${selectedTags.join(' ')}`
          : title.trim());

      await client.createQuestion({
        title: title.trim(),
        body: finalBody,
        category,
      });

      showToast('success', '🎉 Your question is live!');
      setTimeout(() => handleBack(), 1200);
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to post. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const peerTag = user?.department
    ? `${user.department}${user.level ? ` • ${user.level}L` : ''}`
    : 'Student';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Toast ── */}
        {toast && (
          <View
            pointerEvents='none'
            style={[
              styles.toast,
              toast.type === 'success'
                ? styles.toastSuccess
                : styles.toastError,
            ]}
          >
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        )}

        {/* ── Header ── */}
        <LinearGradient
          colors={['#6B21A8', '#9333EA', '#DB2777']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.decorCircle} />
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={20} color='#0D0D0D' strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.headerBody}>
            <Text style={styles.headerLabel}>STUDENT FORUM</Text>
            <Text style={styles.headerTitle}>Ask Your Peers</Text>
          </View>
        </LinearGradient>

        {/* ── Form ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          {/* Peer Context Banner */}
          <View style={styles.peerBanner}>
            <Sparkles size={16} color='#7B2FBE' />
            <Text style={styles.peerBannerText}>
              Posting as <Text style={{ fontWeight: '800' }}>{user?.fullname || 'Student'}</Text> ({peerTag})
            </Text>
          </View>

          {/* Question (Required) */}
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>
              Question <Text style={styles.requiredStar}>*</Text>
            </Text>
            <Text
              style={[
                styles.counter,
                title.length > TITLE_MAX * 0.85 && styles.counterWarn,
              ]}
            >
              {title.length}/{TITLE_MAX}
            </Text>
          </View>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={'E.g. What is the best way to prepare for finals? 📋'}
              placeholderTextColor='#9CA3AF'
              value={title}
              onChangeText={t => setTitle(t.slice(0, TITLE_MAX))}
              returnKeyType='next'
              autoFocus
            />
          </View>

          {/* Category Selector */}
          <Text style={[styles.label, { marginTop: 18, marginBottom: 10 }]}>
            Category
          </Text>
          <View style={styles.categoriesRow}>
            {CATEGORY_OPTIONS.map(opt => {
              const selected = category === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setCategory(opt.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.chipEmoji}>{opt.emoji}</Text>
                  <Text
                    style={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Additional Context (Optional) */}
          <View style={[styles.fieldHeader, { marginTop: 20 }]}>
            <Text style={styles.label}>
              Additional details <Text style={styles.optionalTag}>(Optional)</Text>
            </Text>
            <Text
              style={[
                styles.counter,
                body.length > BODY_MAX * 0.85 && styles.counterWarn,
              ]}
            >
              {body.length}/{BODY_MAX}
            </Text>
          </View>
          <View style={[styles.inputWrapper, styles.textareaWrapper]}>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder={
                "Add context, course code, or what you've tried so far…"
              }
              placeholderTextColor='#9CA3AF'
              value={body}
              onChangeText={t => setBody(t.slice(0, BODY_MAX))}
              multiline
              textAlignVertical='top'
              numberOfLines={4}
            />
          </View>

          {/* Quick Tag Suggestions */}
          <View style={[styles.fieldHeader, { marginTop: 18 }]}>
            <Text style={styles.label}>
              Topic tags <Text style={styles.optionalTag}>(Optional)</Text>
            </Text>
          </View>
          <View style={styles.tagsRow}>
            {SUGGESTED_TAGS.map(tag => {
              const active = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagPill, active && styles.tagPillActive]}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.8}
                >
                  <Hash size={12} color={active ? '#000' : '#6B7280'} />
                  <Text
                    style={[
                      styles.tagPillText,
                      active && styles.tagPillTextActive,
                    ]}
                  >
                    {tag.replace('#', '')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Sticky Submit Bar ── */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!canSubmit || submitting) && styles.submitBtnDisabled,
            ]}
            onPress={submit}
            disabled={!canSubmit || submitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#C4FF0E', '#A3E635']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {submitting ? (
                <ActivityIndicator color='#000' />
              ) : (
                <Text style={styles.submitText}>🚀 Post Question</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EBEFFF' },

  // Toast
  toast: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 200,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  toastSuccess: { backgroundColor: '#DCFCE7', borderColor: '#000' },
  toastError: { backgroundColor: '#FEE2E2', borderColor: '#000' },
  toastText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D0D0D',
    textAlign: 'center',
  },

  // Header
  header: {
    paddingTop: 16,
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderBottomWidth: 2.5,
    borderBottomColor: '#000',
  },
  decorCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -20,
    right: -20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C4FF0E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: '#000',
  },
  headerBody: { flex: 1 },
  headerLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#C4FF0E',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },

  // Form
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16 },

  peerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    marginBottom: 16,
  },
  peerBannerText: {
    fontSize: 12,
    color: '#6B21A8',
    fontWeight: '600',
  },

  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontSize: 14, fontWeight: '800', color: '#0D0D0D' },
  requiredStar: { color: '#EF4444' },
  optionalTag: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  counter: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  counterWarn: { color: '#F59E0B' },

  inputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  textareaWrapper: { minHeight: 90 },
  input: {
    fontSize: 14,
    color: '#0D0D0D',
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  textarea: {
    minHeight: 90,
    fontWeight: '500',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },

  // Categories
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  chipSelected: {
    backgroundColor: '#C4FF0E',
    borderColor: '#000',
  },
  chipEmoji: { fontSize: 13 },
  chipText: { fontSize: 12, fontWeight: '800', color: '#0D0D0D' },
  chipTextSelected: { color: '#0D0D0D' },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  tagPillActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#7B2FBE',
    borderWidth: 1.5,
  },
  tagPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#4B5563',
  },
  tagPillTextActive: {
    color: '#7B2FBE',
    fontWeight: '800',
  },

  // Submit Bar
  submitContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  submitBtn: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#000',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 22,
  },
  submitText: { color: '#000', fontSize: 16, fontWeight: '900' },
});

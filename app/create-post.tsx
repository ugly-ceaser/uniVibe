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
import { ArrowLeft } from 'lucide-react-native';
import { forumApi, useApi } from '@/utils/api';

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

const TITLE_MAX = 80;
const BODY_MAX = 500;

export default function CreatePostScreen() {
  const router = useRouter();
  const api = useApi();
  const client = useMemo(() => forumApi(api), [api]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<CategoryEnum>('GENERAL_DISCUSSION');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const canSubmit = title.trim().length >= 4 && body.trim().length >= 10;

  const showToast = (type: 'success' | 'error', message: string, ms = 2000) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), ms);
  };

  const submit = async () => {
    if (!canSubmit) {
      showToast('error', 'Title (min 4) and details (min 10) are required.');
      return;
    }
    setSubmitting(true);
    try {
      await client.createQuestion({
        title: title.trim(),
        body: body.trim(),
        category,
      });
      showToast('success', '🎉 Your question is live!');
      setTitle('');
      setBody('');
      setCategory('GENERAL_DISCUSSION');
      setTimeout(() => router.back(), 1800);
    } catch (e: any) {
      showToast('error', e?.message || 'Failed to post. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
          colors={['#3B0F6F', '#7B2FBE', '#C026D3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.orb} />
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <ArrowLeft size={20} color='#fff' strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.headerBody}>
            <Text style={styles.headerLabel}>STUDENT FORUM</Text>
            <Text style={styles.headerTitle}>Post a question</Text>
          </View>
        </LinearGradient>

        {/* ── Form ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.fieldHeader}>
            <Text style={styles.label}>Title</Text>
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
              placeholder={'E.g. How do I prepare for finals? 📋'}
              placeholderTextColor='#9CA3AF'
              value={title}
              onChangeText={t => setTitle(t.slice(0, TITLE_MAX))}
              returnKeyType='next'
            />
          </View>

          {/* Details */}
          <View style={[styles.fieldHeader, { marginTop: 18 }]}>
            <Text style={styles.label}>Details</Text>
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
                "Give it enough context so people can\nactually help — what have you tried,\nwhat's confusing?"
              }
              placeholderTextColor='#9CA3AF'
              value={body}
              onChangeText={t => setBody(t.slice(0, BODY_MAX))}
              multiline
              textAlignVertical='top'
              numberOfLines={6}
            />
          </View>

          {/* Tip card */}
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>💡</Text>
            <Text style={styles.tipText}>
              <Text style={styles.tipBold}>Tip: </Text>
              Questions with details get 3x more answers. Screenshots help too.
            </Text>
          </View>

          {/* Category */}
          <Text style={[styles.label, { marginTop: 20, marginBottom: 12 }]}>
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

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Sticky submit button ── */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!canSubmit || submitting) && styles.submitBtnDisabled,
            ]}
            onPress={submit}
            disabled={!canSubmit || submitting}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#F43F5E', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {submitting ? (
                <ActivityIndicator color='#fff' />
              ) : (
                <Text style={styles.submitText}>🚀 Post question</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#EDE9F8' },

  // ── Toast ──
  toast: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 200,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  toastSuccess: { backgroundColor: '#ECFDF5', borderColor: '#34D399' },
  toastError: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  toastText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },

  // ── Header ──
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  orb: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -20,
    right: -20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerBody: { flex: 1 },
  headerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C8F135',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },

  // ── Form ──
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24 },

  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  counter: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  counterWarn: { color: '#F59E0B' },

  inputWrapper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#1a1a2e',
    overflow: 'hidden',
  },
  textareaWrapper: { minHeight: 130 },
  input: {
    fontSize: 15,
    color: '#1a1a2e',
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  textarea: {
    minHeight: 130,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },

  // ── Tip card ──
  tipCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#7B2FBE',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 14,
  },
  tipEmoji: { fontSize: 18, marginTop: 1 },
  tipText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 19 },
  tipBold: { fontWeight: '800', color: '#1a1a2e' },

  // ── Category chips ──
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  chipSelected: {
    backgroundColor: '#C8F135',
    borderColor: '#1a1a2e',
  },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: '700', color: '#1a1a2e' },
  chipTextSelected: { color: '#1a1a2e' },

  // ── Submit ──
  submitContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: '#EDE9F8',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  submitBtn: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    borderRadius: 30,
  },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});

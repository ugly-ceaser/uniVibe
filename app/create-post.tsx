import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { forumApi, useApi } from '@/utils/api';

type CategoryEnum =
  | 'GENERAL_DISCUSSION'
  | 'ACADEMIC_HELP'
  | 'STUDENT_LIFE'
  | 'CAREER_AND_INTERNSHIPS'
  | 'TECH_AND_PROGRAMMING'
  | 'CAMPUS_SERVICES';

const CATEGORY_OPTIONS: { id: CategoryEnum; label: string }[] = [
  { id: 'GENERAL_DISCUSSION',    label: 'General Discussion' },
  { id: 'ACADEMIC_HELP',         label: 'Academic Help' },
  { id: 'STUDENT_LIFE',          label: 'Student Life' },
  { id: 'CAREER_AND_INTERNSHIPS',label: 'Career & Internships' },
  { id: 'TECH_AND_PROGRAMMING',  label: 'Tech & Programming' },
  { id: 'CAMPUS_SERVICES',       label: 'Campus Services' },
];

export default function CreatePostScreen() {
  const router = useRouter();
  const api = useApi();
  const client = useMemo(() => forumApi(api), [api]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<CategoryEnum>('GENERAL_DISCUSSION');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  const canSubmit = title.trim().length >= 4 && body.trim().length >= 10 && !!category;

  const showToast = (type: 'success' | 'error', message: string, durationMs = 1800) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), durationMs);
  };

  const submit = async () => {
    if (!canSubmit) {
      setError('Please enter a title (min 4 chars), body (min 10 chars), and select a category.');
      showToast('error', 'Fill in all fields correctly.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await client.createQuestion({
        title: title.trim(),
        body: body.trim(),
        category,
      });

      const id =
        (res as any)?.data?.id ??
        (res as any)?.data?.question?.id ??
        null;

      setCreatedPostId(id);
      showToast('success', 'Your question has been posted!');
      // Stay on this screen; do not navigate.
      // Optional: clear the form
      setTitle('');
      setBody('');
      setCategory('GENERAL_DISCUSSION');
    } catch (e: any) {
      console.error('Failed to create question', e);
      const msg = e?.message || 'Failed to create question. Please try again.';
      setError(msg);
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Toast */}
      {toast ? (
        <View
          pointerEvents="none"
          style={[
            styles.toast,
            toast.type === 'success' ? styles.toastSuccess : styles.toastError,
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      ) : null}

      <Stack.Screen options={{ headerShown: true, title: 'Post a Question' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="E.g. How do I prepare for finals?"
          value={title}
          onChangeText={setTitle}
          maxLength={120}
        />

        <Text style={styles.label}>Details</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe your question with enough context..."
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
          numberOfLines={8}
        />

        <Text style={styles.label}>Category</Text>
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
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={submit}
          disabled={!canSubmit || submitting}
          accessibilityRole="button"
          accessibilityLabel="Submit your question"
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={[styles.submitBtnGradient, submitting && { opacity: 0.8 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Post Question</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Inline success banner (no auto navigation) */}
      {createdPostId ? (
        <View style={styles.successBanner}>
          <Text style={styles.successBannerText}>Posted successfully.</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8 },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textarea: {
    minHeight: 140,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#667eea',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  chipTextSelected: { color: '#4f46e5' },
  submitBtn: { marginTop: 16, borderRadius: 28, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 28,
  },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#dc2626', marginTop: 8, fontSize: 13 },
  toast: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 100,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  toastSuccess: { backgroundColor: '#ecfdf5', borderColor: '#34d399' },
  toastError: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  toastText: { color: '#111827', fontSize: 13, fontWeight: '700', textAlign: 'center' },

  successBanner: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  successBannerText: { color: '#166534', fontWeight: '700' },
});
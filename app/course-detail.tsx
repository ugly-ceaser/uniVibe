import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  MessageCircle,
  Paperclip,
  Send,
  Search,
  Upload,
  MoreVertical,
  CircleCheck as CheckCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApi } from '@/utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = 'chat' | 'materials';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tags?: Array<{ label: string; color: string }>;
}

interface Material {
  id: string;
  name: string;
  type: 'pdf' | 'pptx' | 'docx' | 'm4a' | 'other';
  size: string;
  date: string;
  aiSummarized?: boolean;
  group: 'THIS WEEK' | 'EARLIER';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FILE_CONFIG: Record<Material['type'], { bg: string; emoji: string }> = {
  pdf: { bg: '#FF3B30', emoji: '📄' },
  pptx: { bg: '#10B981', emoji: '📊' },
  docx: { bg: '#FFD93D', emoji: '📝' },
  m4a: { bg: '#C4FF0E', emoji: '🎵' },
  other: { bg: '#7B2FBE', emoji: '📁' },
};

const QUICK_CHIPS = ['🩷 Quiz me', '📄 Summarize', '🔥 Ask human tutor'];

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    text: "Welcome! I'm your AI tutor for this course. Ask me anything about the material, and I'll help you understand it better.",
    tags: [{ label: '✓ Ready to help', color: '#00E5C0' }],
  },
];

const MOCK_MATERIALS: Material[] = [
  {
    id: '1',
    name: 'Lecture 5 – Trees & Graphs.pdf',
    type: 'pdf',
    size: '2.4 MB',
    date: 'Today',
    aiSummarized: true,
    group: 'THIS WEEK',
  },
  {
    id: '2',
    name: 'Week 5 Slides.pptx',
    type: 'pptx',
    size: '5.1 MB',
    date: 'Yesterday',
    group: 'THIS WEEK',
  },
  {
    id: '3',
    name: 'Assignment 3 Brief.docx',
    type: 'docx',
    size: '140 KB',
    date: 'Mon',
    group: 'THIS WEEK',
  },
  {
    id: '4',
    name: 'Lecture 1 – Intro.pdf',
    type: 'pdf',
    size: '1.2 MB',
    date: '2 wks ago',
    aiSummarized: true,
    group: 'EARLIER',
  },
  {
    id: '5',
    name: 'Audio Notes – BFS.m4a',
    type: 'm4a',
    size: '8.9 MB',
    date: '3 wks ago',
    group: 'EARLIER',
  },
];

// ─── Chat Message Bubble ──────────────────────────────────────────────────────
function ChatBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') {
    return (
      <View style={styles.userBubble}>
        <Text style={styles.userBubbleText}>{msg.text}</Text>
      </View>
    );
  }
  return (
    <View style={styles.aiBubbleWrapper}>
      <View style={styles.aiBubble}>
        <Text style={styles.aiBubbleText}>{msg.text}</Text>
        {msg.tags && msg.tags.length > 0 && (
          <View style={styles.tagRow}>
            {msg.tags.map((tag, i) => (
              <View
                key={i}
                style={[styles.tag, { backgroundColor: tag.color + '33' }]}
              >
                <Text style={[styles.tagText, { color: tag.color }]}>
                  {tag.label}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Material Row ─────────────────────────────────────────────────────────────
function MaterialRow({ item }: { item: Material }) {
  const cfg = FILE_CONFIG[item.type] ?? FILE_CONFIG.other;
  return (
    <TouchableOpacity style={styles.materialRow} activeOpacity={0.8}>
      <View style={[styles.fileIconBox, { backgroundColor: cfg.bg }]}>
        <Text style={styles.fileEmoji}>{cfg.emoji}</Text>
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.fileMeta}>
          {item.size} · {item.date}
        </Text>
      </View>
      {item.aiSummarized && (
        <View style={styles.summBadge}>
          <Text style={styles.summBadgeText}>AI summarized</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CourseDetailScreen() {
  const api = useApi();
  const router = useRouter();
  const { courseId } = useLocalSearchParams();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const chatScrollRef = useRef<ScrollView>(null);

  // ─── Fetch course ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const response = (await api.get(`/courses/${courseId}`)) as any;
        setCourse(response.data);
      } catch (err) {
        console.error('Error fetching course:', err);
      } finally {
        setLoading(false);
      }
    };
    if (courseId) fetchCourse();
  }, [courseId, api]);

  // ─── Chat send ───────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text?: string) => {
      const msg = text ?? inputText.trim();
      if (!msg) return;
      setInputText('');
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: msg,
      };
      setMessages(prev => [...prev, userMsg]);
      setSending(true);
      setTimeout(() => {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: 'Great question! Based on the course material, let me break this down for you…',
          tags: [
            { label: '✓ Core concept', color: '#00E5C0' },
            { label: '↻ Review suggested', color: '#FF9F45' },
          ],
        };
        setMessages(prev => [...prev, aiMsg]);
        setSending(false);
        setTimeout(
          () => chatScrollRef.current?.scrollToEnd({ animated: true }),
          100
        );
      }, 1200);
    },
    [inputText]
  );

  // ─── Filtered materials ──────────────────────────────────────────────────
  const filteredMaterials = MOCK_MATERIALS.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const thisWeek = filteredMaterials.filter(m => m.group === 'THIS WEEK');
  const earlier = filteredMaterials.filter(m => m.group === 'EARLIER');

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.darkContainer}>
        <SafeAreaView
          edges={['top']}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size='large' color='#C4FF0E' />
          <Text style={{ color: '#fff', marginTop: 12, fontWeight: '600' }}>
            Loading course…
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.darkContainer}>
        <SafeAreaView
          edges={['top']}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ color: '#ff6b6b', fontSize: 18, fontWeight: '700' }}>
            Course not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backPillBtn}
          >
            <Text style={styles.backPillBtnText}>← Go back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.darkContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color='#fff' strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.courseIconBox}>
            <BookOpen size={22} color='#000' />
          </View>

          <View style={styles.headerMid}>
            <Text style={styles.headerCode}>{course.code} • TUTOR</Text>
            <Text style={styles.headerName} numberOfLines={1}>
              {course.name}
            </Text>
          </View>

          <TouchableOpacity style={styles.menuBtn}>
            <MoreVertical size={20} color='#aaa' />
          </TouchableOpacity>
        </View>

        {/* ─── Tab Switcher ─── */}
        <View style={styles.tabBar}>
          {(['chat', 'materials'] as TabKey[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={styles.tabBtn}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === tab && styles.tabBtnTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Chat Tab ─── */}
        {activeTab === 'chat' && (
          <View style={styles.chatContainer}>
            {/* Messages */}
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatMessages}
              contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {messages.map(m => (
                <ChatBubble key={m.id} msg={m} />
              ))}
              {sending && (
                <View style={styles.aiBubbleWrapper}>
                  <View style={styles.aiBubble}>
                    <ActivityIndicator size='small' color='#C4FF0E' />
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Ask human tutor CTA */}
            <View style={styles.humanTutorCard}>
              <View style={styles.humanTutorIcon}>
                <Text style={{ fontSize: 20 }}>🤝</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.humanTutorTitle}>Ask a human tutor</Text>
                <Text style={styles.humanTutorSub}>
                  Dr. Adeyemi · Available now
                </Text>
              </View>
              <TouchableOpacity style={styles.requestBtn}>
                <Text style={styles.requestBtnText}>Request review</Text>
              </TouchableOpacity>
            </View>

            {/* Quick action chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickChips}
              style={{ flexShrink: 0, maxHeight: 52 }}
            >
              {QUICK_CHIPS.map(chip => (
                <TouchableOpacity
                  key={chip}
                  style={styles.quickChip}
                  onPress={() => handleSend(chip)}
                >
                  <Text style={styles.quickChipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Input bar */}
            <View style={styles.inputBar}>
              <TouchableOpacity style={styles.attachBtn}>
                <Paperclip size={18} color='#aaa' />
              </TouchableOpacity>
              <TextInput
                style={styles.chatInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder='Ask your tutor anything…'
                placeholderTextColor='#555'
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  !inputText.trim() && styles.sendBtnDisabled,
                ]}
                onPress={() => handleSend()}
                disabled={!inputText.trim()}
              >
                <Send size={16} color={inputText.trim() ? '#000' : '#555'} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── Materials Tab ─── */}
        {activeTab === 'materials' && (
          <View style={styles.materialsContainer}>
            {/* Search */}
            <View style={styles.matSearchBar}>
              <Search size={15} color='#777' />
              <TextInput
                style={styles.matSearchInput}
                placeholder='Search materials…'
                placeholderTextColor='#555'
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
            >
              {thisWeek.length > 0 && (
                <>
                  <Text style={styles.matGroupHeader}>THIS WEEK</Text>
                  {thisWeek.map(m => (
                    <MaterialRow key={m.id} item={m} />
                  ))}
                </>
              )}
              {earlier.length > 0 && (
                <>
                  <Text style={styles.matGroupHeader}>EARLIER</Text>
                  {earlier.map(m => (
                    <MaterialRow key={m.id} item={m} />
                  ))}
                </>
              )}
              {filteredMaterials.length === 0 && (
                <Text style={styles.noMatText}>No materials found.</Text>
              )}
            </ScrollView>

            {/* Upload button */}
            <TouchableOpacity style={styles.uploadBtn}>
              <Upload size={18} color='#fff' />
              <Text style={styles.uploadBtnText}>Upload material</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const DARK = '#1A1A2E';
const CARD_BG = '#252540';

const styles = StyleSheet.create({
  darkContainer: { flex: 1, backgroundColor: DARK },

  // ─── Header ───
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#2A2A45',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#C4FF0E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  headerMid: { flex: 1 },
  headerCode: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7B2FBE',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 20,
  },
  menuBtn: { padding: 6 },
  backPillBtn: {
    marginTop: 16,
    backgroundColor: '#C4FF0E',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#000',
  },
  backPillBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },

  // ─── Tabs ───
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A45',
    marginBottom: 4,
  },
  tabBtn: { marginRight: 24, paddingVertical: 12, alignItems: 'center' },
  tabBtnText: { fontSize: 15, fontWeight: '700', color: '#555' },
  tabBtnTextActive: { color: '#fff' },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#C4FF0E',
    borderRadius: 2,
  },

  // ─── Chat ───
  chatContainer: { flex: 1 },
  chatMessages: { flex: 1 },

  aiBubbleWrapper: { marginBottom: 12 },
  aiBubble: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#3A3A55',
    maxWidth: '88%',
  },
  aiBubbleText: { color: '#E0E0F0', fontSize: 14, lineHeight: 21 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tag: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, fontWeight: '700' },

  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#0D0D0D',
    borderRadius: 18,
    padding: 12,
    maxWidth: '80%',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#3A3A55',
  },
  userBubbleText: { color: '#fff', fontSize: 14, lineHeight: 20 },

  humanTutorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CARD_BG,
    margin: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#7B2FBE',
    borderStyle: 'dashed',
    padding: 12,
  },
  humanTutorIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FF9F4522',
    justifyContent: 'center',
    alignItems: 'center',
  },
  humanTutorTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  humanTutorSub: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 1,
  },
  requestBtn: {
    backgroundColor: '#3A2060',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#7B2FBE',
  },
  requestBtnText: { fontSize: 12, fontWeight: '700', color: '#C4B5FD' },

  quickChips: { paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  quickChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#3A3A55',
    backgroundColor: CARD_BG,
  },
  quickChipText: { fontSize: 13, fontWeight: '700', color: '#E0E0F0' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#2A2A45',
    backgroundColor: DARK,
  },
  attachBtn: { padding: 6 },
  chatInput: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#3A3A55',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#C4FF0E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#2A2A45' },

  // ─── Materials ───
  materialsContainer: { flex: 1, paddingHorizontal: 16 },
  matSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#3A3A55',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    marginTop: 8,
  },
  matSearchInput: { flex: 1, fontSize: 14, color: '#fff' },
  matGroupHeader: {
    fontSize: 11,
    fontWeight: '900',
    color: '#555',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A45',
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  fileEmoji: { fontSize: 20 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '700', color: '#E0E0F0' },
  fileMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  summBadge: {
    backgroundColor: '#7B2FBE33',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#7B2FBE',
  },
  summBadgeText: { fontSize: 10, fontWeight: '700', color: '#C4B5FD' },
  noMatText: {
    color: '#555',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  uploadBtn: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#7B2FBE',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  uploadBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});

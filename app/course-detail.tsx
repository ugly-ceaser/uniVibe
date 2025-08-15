import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  BookOpen,
  User,
  Mail,
  Phone,
  ChartBar as BarChart3,
  CircleCheck as CheckCircle,
} from 'lucide-react-native';
import { coursesApi } from '@/utils/api';

export default function CourseDetailScreen() {
  const router = useRouter();
  const { courseId } = useLocalSearchParams();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        const response = await coursesApi.getById(courseId as string);
        setCourse(response.data);
      } catch (error) {
        console.error('Error fetching course details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading course details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Course not found</Text>
      </SafeAreaView>
    );
  }

  const handleEmailPress = async () => {
    const emailUrl = `mailto:${course.instructorEmail || course.instructor}`;
    try {
      const supported = await Linking.canOpenURL(emailUrl);
      if (supported) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert('Error', 'Cannot open email client');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to open email client:`);
    }
  };

  const handlePhonePress = async () => {
    const phoneUrl = `tel:${course.instructorPhone || '+234 803 123 4567'}`;
    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Cannot make phone call');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to make phone call:');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color='#ffffff' strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <BookOpen size={32} color='#ffffff' strokeWidth={2} />
          </View>
          <Text style={styles.courseCode}>{course.code}</Text>
          <Text style={styles.courseName}>{course.name}</Text>
          <Text style={styles.unitLoad}>
            {course.credits} Units • Semester {course.semester}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Course Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Course Description</Text>
          <Text style={styles.description}>{course.description}</Text>
        </View>

        {/* Coordinator Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Course Coordinator</Text>
          <View style={styles.coordinatorCard}>
            <View style={styles.coordinatorHeader}>
              <View style={styles.coordinatorAvatar}>
                <User size={24} color='#667eea' strokeWidth={2} />
              </View>
              <Text style={styles.coordinatorName}>{course.instructor}</Text>
            </View>

            <View style={styles.contactInfo}>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleEmailPress}
                activeOpacity={0.7}
              >
                <Mail size={16} color='#667eea' strokeWidth={2} />
                <Text style={styles.contactText}>
                  {course.instructorEmail || course.instructor}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.contactButton}
                onPress={handlePhonePress}
                activeOpacity={0.7}
              >
                <Phone size={16} color='#667eea' strokeWidth={2} />
                <Text style={styles.contactText}>
                  {course.instructorPhone || '+234 803 123 4567'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Course Outline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Course Outline</Text>
          <View style={styles.outlineContainer}>
            {(course.outline || []).map((topic: string, index: number) => (
              <View key={index} style={styles.outlineItem}>
                <CheckCircle size={16} color='#43e97b' strokeWidth={2} />
                <Text style={styles.outlineText}>{topic}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Assessment Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assessment Breakdown</Text>
          <View style={styles.assessmentContainer}>
            {(course.assessment || []).map((assessment: any, index: number) => (
              <View key={index} style={styles.assessmentItem}>
                <View style={styles.assessmentInfo}>
                  <BarChart3 size={16} color='#667eea' strokeWidth={2} />
                  <Text style={styles.assessmentType}>{assessment.type}</Text>
                </View>
                <Text style={styles.assessmentPercentage}>
                  {assessment.percentage}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  courseCode: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  courseName: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  unitLoad: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 20,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  coordinatorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  coordinatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coordinatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coordinatorName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
  },
  contactInfo: {
    gap: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#667eea',
    marginLeft: 8,
  },
  outlineContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  outlineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  outlineText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  assessmentContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  assessmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  assessmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assessmentType: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginLeft: 8,
  },
  assessmentPercentage: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#667eea',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 50,
  },
});

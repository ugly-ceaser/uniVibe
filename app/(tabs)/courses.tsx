import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BookOpen, User, ChevronRight } from 'lucide-react-native';
import { useApi } from '@/utils/api';

interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  semester: 1 | 2;
  instructor: string;
}

export default function CoursesScreen() {
  const router = useRouter();
  const { get } = useApi(); // useApi hook
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the unified API hook
        const response = await get<{ data: Course[] }>('/courses');
        setCourses(response.data || []);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [get]);

  const semesterCourses = courses.filter(
    course => course.semester === selectedSemester
  );

  const handleCoursePress = (courseId: string) => {
    router.push({
      pathname: '/course-detail',
      params: { courseId },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <Text style={styles.headerTitle}>CS Year 1 Courses</Text>
          <Text style={styles.headerSubtitle}>
            Computer Science curriculum overview
          </Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <Text style={styles.headerTitle}>CS Year 1 Courses</Text>
        <Text style={styles.headerSubtitle}>
          Computer Science curriculum overview
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Semester Toggle */}
        <View style={styles.semesterToggle}>
          {([1, 2] as const).map(sem => (
            <TouchableOpacity
              key={sem}
              style={[
                styles.semesterButton,
                selectedSemester === sem && styles.activeSemesterButton,
              ]}
              onPress={() => setSelectedSemester(sem)}
            >
              <Text
                style={[
                  styles.semesterText,
                  selectedSemester === sem && styles.activeSemesterText,
                ]}
              >
                {sem === 1 ? 'First Semester' : 'Second Semester'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Courses List */}
        <View style={styles.coursesContainer}>
          {!error && semesterCourses.length === 0 && (
            <Text style={styles.emptyText}>
              No courses found for this semester.
            </Text>
          )}
          {semesterCourses.map(course => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onPress={() => handleCoursePress(course.id)}
              activeOpacity={0.7}
            >
              <View style={styles.courseIconContainer}>
                <BookOpen size={24} color="#667eea" strokeWidth={2} />
              </View>

              <View style={styles.courseContent}>
                <View style={styles.courseHeader}>
                  <Text style={styles.courseCode}>{course.code}</Text>
                  <Text style={styles.unitLoad}>{course.credits} Units</Text>
                </View>
                <Text style={styles.courseName}>{course.name}</Text>
                <Text style={styles.courseDescription} numberOfLines={2}>
                  {course.description}
                </Text>

                <View style={styles.coordinatorInfo}>
                  <User size={14} color="#9ca3af" strokeWidth={2} />
                  <Text style={styles.coordinatorName}>
                    {course.instructor}
                  </Text>
                </View>
              </View>

              <ChevronRight size={20} color="#9ca3af" strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Stats */}
        {semesterCourses.length > 0 && (
          <View style={styles.summaryContainer}>
            <LinearGradient
              colors={['#f0f4ff', '#ffffff']}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryTitle}>Semester Summary</Text>
              <View style={styles.summaryStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {semesterCourses.length}
                  </Text>
                  <Text style={styles.statLabel}>Courses</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {semesterCourses.reduce(
                      (total, course) => total + course.credits,
                      0
                    )}
                  </Text>
                  <Text style={styles.statLabel}>Total Units</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}
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
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  semesterToggle: {
    flexDirection: 'row',
    margin: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  semesterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeSemesterButton: {
    backgroundColor: '#667eea',
  },
  semesterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
  },
  activeSemesterText: {
    color: '#ffffff',
  },
  coursesContainer: {
    paddingHorizontal: 20,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  courseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  courseContent: {
    flex: 1,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
  },
  unitLoad: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#9ca3af',
  },
  courseName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginBottom: 4,
  },
  courseDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  coordinatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordinatorName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9ca3af',
    marginLeft: 6,
  },
  summaryContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 20,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6b7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
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
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    padding: 20,
  },
});

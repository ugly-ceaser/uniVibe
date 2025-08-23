import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Heart, Share, Clock, User } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useGuide } from "@/hooks/useGuide";
import { ErrorMessage } from "@/components/ErrorMessage";

export default function GuideDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { guide, loading, error, refetch } = useGuide(id as string);

  const [isLiked, setIsLiked] = React.useState(false);
  const [likesCount, setLikesCount] = React.useState(0);

  React.useEffect(() => {
    if (guide) {
      setLikesCount(guide.likes);
    }
  }, [guide]);

  const handleLike = async () => {
    if (!guide?.id) return;
    try {
      setIsLiked(!isLiked);
      setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
    } catch (err) {
      console.error("Error toggling like:", err);
      setIsLiked(isLiked);
      setLikesCount((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const handleShare = () => {
    console.log("Share guide:", guide?.title);
  };

  return (
    <>
      {/* ✅ Enhanced default navigation header with guaranteed back button */}
      

      <SafeAreaView style={styles.container}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading guide...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <ErrorMessage message={error} onRetry={refetch} />
          </View>
        ) : !guide ? (
          <View style={styles.centered}>
            <Text style={styles.notFoundText}>Guide not found</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              style={styles.guideHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.guideCategory}>{guide.category}</Text>
              <Text style={styles.guideTitle}>{guide.title}</Text>

              <View style={styles.guideMeta}>
                <View style={styles.metaItem}>
                  <Clock size={16} color="rgba(255, 255, 255, 0.85)" />
                  <Text style={styles.metaText}>{guide.readTime}</Text>
                </View>
                <View style={styles.metaItem}>
                  <User size={16} color="rgba(255, 255, 255, 0.85)" />
                  <Text style={styles.metaText}>{guide.author}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Heart size={16} color="rgba(255, 255, 255, 0.85)" />
                  <Text style={styles.metaText}>{likesCount} likes</Text>
                </View>
              </View>

              {/* Like and Share buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={handleLike}
                  style={[styles.actionButton, isLiked && styles.likedButton]}
                >
                  <Heart
                    size={20}
                    color={isLiked ? "#ffffff" : "rgba(255, 255, 255, 0.9)"}
                    fill={isLiked ? "#ffffff" : "none"}
                  />
                  <Text
                    style={[styles.actionText, isLiked && styles.likedText]}
                  >
                    {isLiked ? "Liked" : "Like"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                  <Share size={20} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Body Section */}
            <View style={styles.guideContent}>
              <Text style={styles.contentText}>{guide.content}</Text>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

// Keep your existing styles...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  notFoundText: {
    fontSize: 18,
    color: "#6b7280",
    textAlign: "center",
  },
  guideHeader: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
  },
  guideCategory: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.85)",
    textTransform: "uppercase",
    marginBottom: 10,
    letterSpacing: 1,
  },
  guideTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 20,
    lineHeight: 38,
  },
  guideMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    marginBottom: 24,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  likedButton: {
    backgroundColor: "rgba(245, 101, 101, 0.8)",
    borderColor: "rgba(245, 101, 101, 0.9)",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
  },
  likedText: {
    color: "#ffffff",
  },
  guideContent: {
    padding: 20,
    backgroundColor: "#ffffff",
    margin: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#374151",
  },
});

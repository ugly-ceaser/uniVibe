import { Router } from 'expo-router';

export function openPost(router: Router, id: string) {
  router.push({ pathname: '/post/[id]', params: { id } });
}

export function openCourse(router: Router, id: string) {
  router.push({ pathname: '/course-detail', params: { courseId: id } });
}

export function openTip(router: Router, id: string) {
  router.push({ pathname: '/tip-detail', params: { tipId: id } });
}

export function openGuide(router: Router, id: string) {
  router.push({ pathname: '/guide/[id]', params: { id } });
}

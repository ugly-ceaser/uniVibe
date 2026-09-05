import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import CourseAIChat from '@/components/CourseAIChat';
import { aiApi, useApi } from '@/utils/api';
import type { Course } from '@/types/course';

jest.setTimeout(15000);

jest.mock('@/utils/api', () => ({
  aiApi: jest.fn(),
  useApi: jest.fn(),
}));

const course: Course = {
  id: 'course-1',
  courseCode: 'CSC 301',
  title: 'Data Structures',
  creditUnit: 3,
};

const sessionResponse = {
  data: {
    session: {
      id: 'session-1',
      studentId: 'student-1',
      courseId: 'course-1',
      title: 'CSC 301 chat',
      createdAt: '2026-09-03T08:00:00.000Z',
      messages: [
        {
          id: 'message-1',
          role: 'assistant' as const,
          content: 'A saved explanation',
          createdAt: '2026-09-03T08:00:00.000Z',
        },
      ],
    },
    course: { id: 'course-1', name: 'Data Structures', code: 'CSC 301' },
  },
  message: 'ok',
};

describe('CourseAIChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useApi as jest.Mock).mockReturnValue({});
  });

  it('loads saved history and sends messages to the course AI service', async () => {
    const client = {
      getCourseActiveSession: jest.fn().mockResolvedValue(sessionResponse),
      courseChat: jest.fn().mockResolvedValue({
        data: { response: 'A backend answer' },
        sessionId: 'session-1',
      }),
      deleteChatSession: jest.fn(),
    };
    (aiApi as jest.Mock).mockReturnValue(client);

    const screen = render(<CourseAIChat course={course} />);
    expect(await screen.findByText('A saved explanation')).toBeTruthy();

    fireEvent.changeText(
      screen.getByPlaceholderText('Ask about CSC 301…'),
      'Explain a binary tree'
    );
    fireEvent.press(screen.getByLabelText('Send message'));

    await waitFor(() =>
      expect(client.courseChat).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'course-1',
          message: 'Explain a binary tree',
        })
      )
    );
    expect(await screen.findByText('A backend answer')).toBeTruthy();
  });

  it('shows a retry action instead of inventing history when loading fails', async () => {
    const client = {
      getCourseActiveSession: jest
        .fn()
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce({
          ...sessionResponse,
          data: {
            ...sessionResponse.data,
            session: { ...sessionResponse.data.session, messages: [] },
          },
        }),
      courseChat: jest.fn(),
      deleteChatSession: jest.fn(),
    };
    (aiApi as jest.Mock).mockReturnValue(client);

    const screen = render(<CourseAIChat course={course} />);
    expect(
      await screen.findByText('Chat history could not be loaded')
    ).toBeTruthy();
    fireEvent.press(screen.getByText('Retry'));

    expect(await screen.findByText('Ask about CSC 301')).toBeTruthy();
    expect(client.getCourseActiveSession).toHaveBeenCalledTimes(2);
  });
});

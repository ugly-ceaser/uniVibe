import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  screen,
} from '@testing-library/react-native';
import GlobalChatButton from '@/components/GlobalChatButton';

// Mock the validation utility
jest.mock('@/utils/validation', () => ({
  validateChatMessage: jest.fn(),
}));

// Mock the theme constants
jest.mock('@/constants/theme', () => ({
  gradients: {
    primary: ['#667eea', '#764ba2'],
  },
  shadows: {
    lg: {},
    sm: {},
  },
  animation: {},
}));

describe('GlobalChatButton', () => {
  const mockOnMessageSent = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the FAB button correctly', () => {
    render(<GlobalChatButton />);

    const fabButton = screen.getByRole('button');
    expect(fabButton).toBeTruthy();
    expect(fabButton).toHaveAccessibilityLabel('Open AI chat assistant');
  });

  it('opens chat modal when FAB is pressed', () => {
    render(<GlobalChatButton />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    expect(screen.getByText('AI Assistant')).toBeTruthy();
    expect(
      screen.getByText(
        "Hello! I'm your AI assistant. How can I help you with your university life today?"
      )
    ).toBeTruthy();
  });

  it('displays initial AI message', () => {
    render(<GlobalChatButton />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    const initialMessage = screen.getByText(
      "Hello! I'm your AI assistant. How can I help you with your university life today?"
    );
    expect(initialMessage).toBeTruthy();
  });

  it('allows user to type and send messages', async () => {
    const { validateChatMessage } = require('@/utils/validation');
    validateChatMessage.mockReturnValue({ isValid: true, errors: [] });

    render(<GlobalChatButton onMessageSent={mockOnMessageSent} />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    const input = screen.getByPlaceholderText(
      'Ask me anything about university life...'
    );
    fireEvent.changeText(input, 'How do I study effectively?');

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(screen.getByText('How do I study effectively?')).toBeTruthy();
    });

    expect(mockOnMessageSent).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'How do I study effectively?',
        isUser: true,
      })
    );
  });

  it('shows loading state when sending message', async () => {
    const { validateChatMessage } = require('@/utils/validation');
    validateChatMessage.mockReturnValue({ isValid: true, errors: [] });

    render(<GlobalChatButton />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    const input = screen.getByPlaceholderText(
      'Ask me anything about university life...'
    );
    fireEvent.changeText(input, 'Test message');

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    fireEvent.press(sendButton);

    expect(screen.getByText('AI is typing...')).toBeTruthy();
  });

  it('displays AI response after sending message', async () => {
    const { validateChatMessage } = require('@/utils/validation');
    validateChatMessage.mockReturnValue({ isValid: true, errors: [] });

    render(<GlobalChatButton />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    const input = screen.getByPlaceholderText(
      'Ask me anything about university life...'
    );
    fireEvent.changeText(input, 'Test message');

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    fireEvent.press(sendButton);

    // Fast-forward timers to simulate AI response
    jest.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(screen.queryByText('AI is typing...')).toBeFalsy();
    });

    // Should show one of the mock AI responses
    const aiResponses = [
      'Great question! For academic success, I recommend creating a study schedule and sticking to it. Break down your coursework into manageable chunks.',
      "That's a common concern for freshers! Try joining study groups and don't hesitate to ask your lecturers for help during office hours.",
      'For budgeting, track your expenses weekly and prioritize needs over wants. Look for student discounts wherever possible.',
      'Campus safety is important! Always walk in groups at night and save the security office number in your phone.',
      "Social life balance is key! Join clubs that interest you, but don't overcommit. Quality friendships matter more than quantity.",
    ];

    const hasAIResponse = aiResponses.some(
      response => screen.queryByText(response) !== null
    );
    expect(hasAIResponse).toBe(true);
  });

  it('validates messages before sending', () => {
    const { validateChatMessage } = require('@/utils/validation');
    validateChatMessage.mockReturnValue({
      isValid: false,
      errors: ['Message text is required'],
    });

    render(<GlobalChatButton onError={mockOnError} />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    const input = screen.getByPlaceholderText(
      'Ask me anything about university life...'
    );
    fireEvent.changeText(input, '');

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    fireEvent.press(sendButton);

    expect(mockOnError).toHaveBeenCalledWith('Message text is required');
  });

  it('prevents sending empty messages', () => {
    render(<GlobalChatButton />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    expect(sendButton).toBeDisabled();
  });

  it('limits input to 500 characters', () => {
    render(<GlobalChatButton />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    const input = screen.getByPlaceholderText(
      'Ask me anything about university life...'
    );
    const longText = 'a'.repeat(501);
    fireEvent.changeText(input, longText);

    expect(input.props.value).toHaveLength(500);
  });

  it('displays character count', () => {
    render(<GlobalChatButton />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    const input = screen.getByPlaceholderText(
      'Ask me anything about university life...'
    );
    fireEvent.changeText(input, 'Test message');

    expect(screen.getByText('12/500')).toBeTruthy();
  });

  it('closes modal when close button is pressed', () => {
    render(<GlobalChatButton />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    expect(screen.getByText('AI Assistant')).toBeTruthy();

    const closeButton = screen.getByRole('button', { name: 'Close chat' });
    fireEvent.press(closeButton);

    expect(screen.queryByText('AI Assistant')).toBeFalsy();
  });

  it('resets input when modal is closed', () => {
    render(<GlobalChatButton />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    const input = screen.getByPlaceholderText(
      'Ask me anything about university life...'
    );
    fireEvent.changeText(input, 'Test message');

    const closeButton = screen.getByRole('button', { name: 'Close chat' });
    fireEvent.press(closeButton);

    // Reopen modal
    fireEvent.press(fabButton);

    const newInput = screen.getByPlaceholderText(
      'Ask me anything about university life...'
    );
    expect(newInput.props.value).toBe('');
  });

  it('shows message count in header', () => {
    render(<GlobalChatButton />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    expect(screen.getByText('(1)')).toBeTruthy();
  });

  it('handles errors gracefully', async () => {
    const { validateChatMessage } = require('@/utils/validation');
    validateChatMessage.mockImplementation(() => {
      throw new Error('Validation error');
    });

    render(<GlobalChatButton onError={mockOnError} />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    const input = screen.getByPlaceholderText(
      'Ask me anything about university life...'
    );
    fireEvent.changeText(input, 'Test message');

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    fireEvent.press(sendButton);

    expect(mockOnError).toHaveBeenCalledWith('Validation error');
  });

  it('respects maxMessages limit', () => {
    const { validateChatMessage } = require('@/utils/validation');
    validateChatMessage.mockReturnValue({ isValid: true, errors: [] });

    render(<GlobalChatButton maxMessages={2} onError={mockOnError} />);

    const fabButton = screen.getByRole('button');
    fireEvent.press(fabButton);

    const input = screen.getByPlaceholderText(
      'Ask me anything about university life...'
    );
    fireEvent.changeText(input, 'First message');

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    fireEvent.press(sendButton);

    // Wait for AI response
    jest.advanceTimersByTime(1500);

    // Try to send another message
    fireEvent.changeText(input, 'Second message');
    fireEvent.press(sendButton);

    expect(mockOnError).toHaveBeenCalledWith(
      'Maximum message limit reached. Please start a new conversation.'
    );
  });
});

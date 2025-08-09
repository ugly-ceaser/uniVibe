export interface ForumPost {
  id: string;
  title: string;
  author: string;
  description: string;
  content: string;
  comments: Comment[];
  createdAt: string;
  category: 'Academic' | 'Social' | 'General' | 'Technical';
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export const forumPosts: ForumPost[] = [
  {
    id: '1',
    title: 'How to prepare for CSC 101 exam?',
    author: 'Sarah Johnson',
    description: 'Looking for study tips and resources for the upcoming Introduction to Computer Science exam.',
    content: 'Hi everyone! I\'m struggling with some concepts in CSC 101, particularly algorithms and data structures. The exam is next week and I want to make sure I\'m well prepared. Does anyone have good study materials or tips they can share?\n\nSpecifically, I\'m having trouble with:\n- Sorting algorithms\n- Time complexity analysis\n- Basic data structures like stacks and queues\n\nAny help would be greatly appreciated!',
    category: 'Academic',
    createdAt: '2 hours ago',
    comments: [
      {
        id: '1',
        author: 'Mike Chen',
        content: 'I found the textbook examples really helpful. Also, try practicing with online coding platforms like HackerRank.',
        createdAt: '1 hour ago',
      },
      {
        id: '2',
        author: 'Emma Wilson',
        content: 'The lecturer uploaded some practice problems on the portal. Make sure to check those out!',
        createdAt: '45 minutes ago',
      },
      {
        id: '3',
        author: 'David Okafor',
        content: 'I can share my notes with you. They have visual diagrams for the data structures that really helped me understand.',
        createdAt: '30 minutes ago',
      },
    ],
  },
  {
    id: '2',
    title: 'Best places to eat on campus?',
    author: 'Alex Thompson',
    description: 'New student looking for recommendations on where to get good and affordable meals.',
    content: 'Just started my first semester and I\'m still figuring out the best places to eat on campus. I\'ve tried the main cafeteria but wondering if there are other good options.\n\nI\'m looking for:\n- Affordable meals (student budget!)\n- Good variety\n- Clean and hygienic places\n- Maybe some local Nigerian dishes?\n\nWhat are your favorite spots?',
    category: 'General',
    createdAt: '5 hours ago',
    comments: [
      {
        id: '4',
        author: 'Fatima Abdul',
        content: 'The small cafeteria near the library has amazing jollof rice and it\'s really affordable!',
        createdAt: '4 hours ago',
      },
      {
        id: '5',
        author: 'John Adebayo',
        content: 'Try the food court behind the engineering building. They have great suya and local dishes.',
        createdAt: '3 hours ago',
      },
    ],
  },
  {
    id: '3',
    title: 'Study group for MTH 101?',
    author: 'Grace Okoro',
    description: 'Looking to form a study group for Mathematics 101. Anyone interested?',
    content: 'Hi! I\'m looking to form a study group for MTH 101 (Calculus I). I think studying together would really help us all understand the concepts better.\n\nI\'m thinking we could meet twice a week, maybe in the library or one of the study rooms. We could work through problem sets together and help each other with difficult topics.\n\nWho\'s interested? Drop a comment below!',
    category: 'Academic',
    createdAt: '1 day ago',
    comments: [
      {
        id: '6',
        author: 'Peter Okonkwo',
        content: 'I\'m definitely interested! Calculus is challenging and I could use the help.',
        createdAt: '20 hours ago',
      },
      {
        id: '7',
        author: 'Mary Eze',
        content: 'Count me in! When are you thinking of starting?',
        createdAt: '18 hours ago',
      },
      {
        id: '8',
        author: 'Samuel Bello',
        content: 'I\'d love to join. I\'m good with derivatives but struggling with integrals.',
        createdAt: '15 hours ago',
      },
    ],
  },
  {
    id: '4',
    title: 'WiFi password for library?',
    author: 'Jennifer Ade',
    description: 'Can\'t connect to the library WiFi. Does anyone know the current password?',
    content: 'I\'m trying to connect to the library WiFi but the password I have doesn\'t seem to work anymore. Has it been changed recently?\n\nI need to submit an assignment online and my data is running low. Any help would be appreciated!',
    category: 'General',
    createdAt: '3 days ago',
    comments: [
      {
        id: '9',
        author: 'Tech Support',
        content: 'The password was updated last week. Please visit the IT desk on the ground floor of the library for the new credentials.',
        createdAt: '3 days ago',
      },
    ],
  },
  {
    id: '5',
    title: 'Programming assignment help - Python',
    author: 'Robert Kim',
    description: 'Stuck on a Python assignment about loops and functions. Need some guidance.',
    content: 'I\'m working on our Python assignment for CSC 102 and I\'m stuck on question 3. It\'s about creating a function that calculates the factorial of a number using loops.\n\nI understand the concept but I\'m having trouble with the implementation. Can someone point me in the right direction without giving away the complete solution?\n\nHere\'s what I have so far:\n```python\ndef factorial(n):\n    # I know I need a loop here\n    # But I\'m not sure how to structure it\n```',
    category: 'Technical',
    createdAt: '1 week ago',
    comments: [
      {
        id: '10',
        author: 'Lisa Wang',
        content: 'Think about what factorial means mathematically. 5! = 5 × 4 × 3 × 2 × 1. You need to multiply all numbers from n down to 1.',
        createdAt: '1 week ago',
      },
      {
        id: '11',
        author: 'Ahmed Hassan',
        content: 'Start with a variable to store the result (initialize to 1), then use a for loop to multiply by each number.',
        createdAt: '6 days ago',
      },
    ],
  },
];

export const getPostsByCategory = (category: ForumPost['category']) => {
  return forumPosts.filter(post => post.category === category);
};

export const getPostById = (id: string) => {
  return forumPosts.find(post => post.id === id);
};
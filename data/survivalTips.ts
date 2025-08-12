export interface SurvivalTip {
  id: string;
  title: string;
  description: string;
  category: 'Academics' | 'Social Life' | 'Budgeting' | 'Safety';
  content: string;
  readTime: string;
}

export const survivalTips: SurvivalTip[] = [
  // Academics
  {
    id: '1',
    title: 'Master Your Study Schedule',
    description: 'Create a balanced study routine that works for you',
    category: 'Academics',
    content:
      'Creating an effective study schedule is crucial for academic success. Start by identifying your peak concentration hours and schedule your most challenging subjects during these times. Use the Pomodoro Technique: study for 25 minutes, then take a 5-minute break. This helps maintain focus and prevents burnout.\n\nAllocate specific time slots for each subject and stick to them. Include buffer time for unexpected assignments or revision. Remember to balance study time with breaks and social activities to maintain your mental health.',
    readTime: '3 min read',
  },
  {
    id: '2',
    title: 'Build Relationships with Lecturers',
    description: 'Professional networking starts in the classroom',
    category: 'Academics',
    content:
      "Building good relationships with your lecturers can significantly impact your academic journey. Attend office hours regularly, ask thoughtful questions during lectures, and participate actively in class discussions.\n\nDon't wait until you're struggling to reach out. Introduce yourself early in the semester and show genuine interest in the subject matter. This can lead to research opportunities, strong recommendation letters, and valuable mentorship.",
    readTime: '2 min read',
  },
  {
    id: '3',
    title: 'Form Study Groups',
    description: 'Collaborative learning enhances understanding',
    category: 'Academics',
    content:
      'Study groups can be incredibly effective when done right. Choose committed group members who share similar academic goals. Establish clear ground rules about meeting times, preparation expectations, and group dynamics.\n\nRotate leadership roles and teaching responsibilities. Explaining concepts to others reinforces your own understanding. Use study groups for problem-solving sessions, exam preparation, and project collaboration.',
    readTime: '4 min read',
  },

  // Social Life
  {
    id: '4',
    title: 'Join Student Organizations',
    description: 'Get involved in campus activities and clubs',
    category: 'Social Life',
    content:
      "Joining student organizations is one of the best ways to make friends and develop leadership skills. Look for clubs related to your interests, academic field, or hobbies. Don't be afraid to try something new!\n\nParticipate actively in club activities and consider taking on leadership roles. These experiences will enhance your resume and provide valuable networking opportunities. Balance your involvement to avoid overcommitment.",
    readTime: '3 min read',
  },
  {
    id: '5',
    title: 'Maintain Work-Life Balance',
    description: "Success isn't just about grades",
    category: 'Social Life',
    content:
      "University life is about more than just academics. Make time for hobbies, exercise, and social activities. These experiences contribute to your personal growth and mental well-being.\n\nSet boundaries between study time and personal time. Learn to say no to activities that don't align with your priorities. Remember that taking breaks and having fun actually improves your academic performance.",
    readTime: '3 min read',
  },

  // Budgeting
  {
    id: '6',
    title: 'Create a Monthly Budget',
    description: 'Track your expenses and save money',
    category: 'Budgeting',
    content:
      'Creating and sticking to a budget is essential for financial stability during university. Track all your income sources (allowances, part-time jobs, scholarships) and categorize your expenses (tuition, accommodation, food, transportation, entertainment).\n\nUse budgeting apps or a simple spreadsheet to monitor your spending. Allocate 50% for needs, 30% for wants, and 20% for savings. Review and adjust your budget monthly based on your spending patterns.',
    readTime: '4 min read',
  },
  {
    id: '7',
    title: 'Find Student Discounts',
    description: 'Save money with your student status',
    category: 'Budgeting',
    content:
      'Your student ID is your ticket to numerous discounts! Many businesses offer student discounts on food, transportation, software, and entertainment. Always ask if a student discount is available before making purchases.\n\nLook for campus meal plans, group buying opportunities, and second-hand textbook markets. Consider sharing resources like textbooks and study materials with classmates to reduce costs.',
    readTime: '2 min read',
  },

  // Safety
  {
    id: '8',
    title: 'Campus Safety Awareness',
    description: 'Stay safe and know emergency procedures',
    category: 'Safety',
    content:
      'Familiarize yourself with campus security procedures and emergency contacts. Save important numbers in your phone: campus security, health center, and emergency services.\n\nWhen walking alone at night, stick to well-lit paths and inform someone of your whereabouts. Be aware of your surroundings and trust your instincts. Know the locations of emergency call boxes and safe spaces on campus.',
    readTime: '3 min read',
  },
  {
    id: '9',
    title: 'Digital Security',
    description: 'Protect your personal information online',
    category: 'Safety',
    content:
      "Use strong, unique passwords for all your accounts, especially university portals and email. Enable two-factor authentication wherever possible. Be cautious about sharing personal information on social media.\n\nUse the university's secure Wi-Fi networks and avoid public Wi-Fi for sensitive activities. Regularly backup your academic work to cloud storage or external drives to prevent data loss.",
    readTime: '3 min read',
  },
];

export const getTipsByCategory = (category: SurvivalTip['category']) => {
  return survivalTips.filter(tip => tip.category === category);
};

export const getTipById = (id: string) => {
  return survivalTips.find(tip => tip.id === id);
};

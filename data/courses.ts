export interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  coordinator: string;
  coordinatorEmail: string;
  coordinatorPhone: string;
  unitLoad: number;
  semester: 1 | 2;
  outline: string[];
  assessment: {
    type: string;
    percentage: number;
  }[];
  description: string;
}

export const courses: Course[] = [
  {
    id: '1',
    courseCode: 'CSC 101',
    courseName: 'Introduction to Computer Science',
    coordinator: 'Dr. Adebayo Ogundimu',
    coordinatorEmail: 'a.ogundimu@university.edu.ng',
    coordinatorPhone: '+234 803 123 4567',
    unitLoad: 3,
    semester: 1,
    description:
      'An introduction to the fundamental concepts of computer science, including problem-solving, algorithms, and programming basics.',
    outline: [
      'Introduction to Computing',
      'Problem Solving and Algorithms',
      'Number Systems and Data Representation',
      'Introduction to Programming Languages',
      'Basic Programming Concepts',
      'Control Structures',
      'Functions and Procedures',
      'Arrays and Strings',
      'File Handling',
      'Introduction to Software Engineering',
    ],
    assessment: [
      { type: 'Continuous Assessment', percentage: 30 },
      { type: 'Mid-term Exam', percentage: 20 },
      { type: 'Final Exam', percentage: 50 },
    ],
  },
  {
    id: '2',
    courseCode: 'CSC 102',
    courseName: 'Programming Fundamentals',
    coordinator: 'Prof. Kemi Adeyemi',
    coordinatorEmail: 'k.adeyemi@university.edu.ng',
    coordinatorPhone: '+234 805 987 6543',
    unitLoad: 4,
    semester: 1,
    description:
      'Hands-on programming course focusing on Python programming language and fundamental programming concepts.',
    outline: [
      'Python Syntax and Semantics',
      'Variables and Data Types',
      'Operators and Expressions',
      'Control Flow Statements',
      'Functions and Modules',
      'Lists, Tuples, and Dictionaries',
      'String Manipulation',
      'File Input/Output',
      'Error Handling and Debugging',
      'Object-Oriented Programming Basics',
    ],
    assessment: [
      { type: 'Programming Assignments', percentage: 40 },
      { type: 'Lab Tests', percentage: 20 },
      { type: 'Final Project', percentage: 40 },
    ],
  },
  {
    id: '3',
    courseCode: 'MTH 101',
    courseName: 'Calculus I',
    coordinator: 'Dr. Olumide Fashola',
    coordinatorEmail: 'o.fashola@university.edu.ng',
    coordinatorPhone: '+234 807 456 7890',
    unitLoad: 3,
    semester: 1,
    description:
      'Introduction to differential and integral calculus with applications to computer science.',
    outline: [
      'Functions and Limits',
      'Continuity',
      'Derivatives and Differentiation Rules',
      'Applications of Derivatives',
      'Optimization Problems',
      'Integration Techniques',
      'Definite and Indefinite Integrals',
      'Applications of Integration',
      'Sequences and Series',
      'Mathematical Modeling',
    ],
    assessment: [
      { type: 'Assignments', percentage: 20 },
      { type: 'Mid-term Exam', percentage: 30 },
      { type: 'Final Exam', percentage: 50 },
    ],
  },
  {
    id: '4',
    courseCode: 'PHY 101',
    courseName: 'General Physics I',
    coordinator: 'Dr. Chioma Nwosu',
    coordinatorEmail: 'c.nwosu@university.edu.ng',
    coordinatorPhone: '+234 809 234 5678',
    unitLoad: 3,
    semester: 1,
    description:
      'Fundamental principles of mechanics, waves, and thermodynamics with laboratory component.',
    outline: [
      'Measurement and Units',
      'Motion in One Dimension',
      'Motion in Two Dimensions',
      "Newton's Laws of Motion",
      'Work, Energy, and Power',
      'Momentum and Collisions',
      'Rotational Motion',
      'Simple Harmonic Motion',
      'Waves and Sound',
      'Temperature and Heat',
    ],
    assessment: [
      { type: 'Laboratory Reports', percentage: 25 },
      { type: 'Continuous Assessment', percentage: 25 },
      { type: 'Final Exam', percentage: 50 },
    ],
  },
  {
    id: '5',
    courseCode: 'ENG 101',
    courseName: 'English Composition',
    coordinator: 'Dr. Folake Adebisi',
    coordinatorEmail: 'f.adebisi@university.edu.ng',
    coordinatorPhone: '+234 806 345 6789',
    unitLoad: 2,
    semester: 1,
    description:
      'Development of writing skills, critical thinking, and effective communication in English.',
    outline: [
      'Grammar and Sentence Structure',
      'Paragraph Development',
      'Essay Writing Techniques',
      'Research and Citation Methods',
      'Critical Reading Skills',
      'Argumentative Writing',
      'Descriptive and Narrative Writing',
      'Business Communication',
      'Presentation Skills',
      'Peer Review and Editing',
    ],
    assessment: [
      { type: 'Essays and Assignments', percentage: 50 },
      { type: 'Class Participation', percentage: 20 },
      { type: 'Final Exam', percentage: 30 },
    ],
  },
  {
    id: '6',
    courseCode: 'CSC 201',
    courseName: 'Data Structures and Algorithms',
    coordinator: 'Dr. Ibrahim Musa',
    coordinatorEmail: 'i.musa@university.edu.ng',
    coordinatorPhone: '+234 808 567 8901',
    unitLoad: 4,
    semester: 2,
    description:
      'Advanced study of data structures, algorithms, and their implementation in programming.',
    outline: [
      'Abstract Data Types',
      'Arrays and Linked Lists',
      'Stacks and Queues',
      'Trees and Binary Trees',
      'Hash Tables',
      'Sorting Algorithms',
      'Searching Algorithms',
      'Graph Algorithms',
      'Algorithm Analysis',
      'Dynamic Programming',
    ],
    assessment: [
      { type: 'Programming Projects', percentage: 45 },
      { type: 'Mid-term Exam', percentage: 25 },
      { type: 'Final Exam', percentage: 30 },
    ],
  },
  {
    id: '7',
    courseCode: 'MTH 102',
    courseName: 'Calculus II',
    coordinator: 'Prof. Adunni Oladele',
    coordinatorEmail: 'a.oladele@university.edu.ng',
    coordinatorPhone: '+234 804 678 9012',
    unitLoad: 3,
    semester: 2,
    description:
      'Continuation of Calculus I with focus on advanced integration techniques and series.',
    outline: [
      'Integration by Parts',
      'Trigonometric Integrals',
      'Partial Fractions',
      'Improper Integrals',
      'Infinite Sequences',
      'Infinite Series',
      'Power Series',
      'Taylor and Maclaurin Series',
      'Parametric Equations',
      'Polar Coordinates',
    ],
    assessment: [
      { type: 'Assignments', percentage: 20 },
      { type: 'Mid-term Exam', percentage: 30 },
      { type: 'Final Exam', percentage: 50 },
    ],
  },
  {
    id: '8',
    courseCode: 'STA 101',
    courseName: 'Introduction to Statistics',
    coordinator: 'Dr. Blessing Okwu',
    coordinatorEmail: 'b.okwu@university.edu.ng',
    coordinatorPhone: '+234 802 789 0123',
    unitLoad: 2,
    semester: 2,
    description:
      'Basic statistical concepts and methods with applications to computer science.',
    outline: [
      'Descriptive Statistics',
      'Probability Theory',
      'Random Variables',
      'Probability Distributions',
      'Sampling and Estimation',
      'Hypothesis Testing',
      'Correlation and Regression',
      'Chi-Square Tests',
      'ANOVA',
      'Statistical Software Applications',
    ],
    assessment: [
      { type: 'Assignments', percentage: 30 },
      { type: 'Mid-term Exam', percentage: 30 },
      { type: 'Final Exam', percentage: 40 },
    ],
  },
];

export const getCoursesBySemester = (semester: 1 | 2) => {
  return courses.filter(course => course.semester === semester);
};

export const getCourseById = (id: string) => {
  return courses.find(course => course.id === id);
};

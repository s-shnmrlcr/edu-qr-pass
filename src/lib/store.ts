import { create } from 'zustand';

// We'll use a simple store approach with localStorage persistence
// since no backend is connected yet.

export type Role = 'admin' | 'teacher';
export type GradeLevel = 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10' | 'Grade 11' | 'Grade 12';
export type Gender = 'Male' | 'Female';
export type AttendanceStatus = 'Present' | 'Late' | 'Absent';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  gradeLevel?: GradeLevel;
  createdAt: string;
}

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  gradeLevel: GradeLevel;
  gender: Gender;
  createdAt: string;
  createdBy: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  gradeLevel: GradeLevel;
  date: string;
  timeScanned: string;
  status: AttendanceStatus;
}

interface AppState {
  users: User[];
  currentUser: User | null;
  students: Student[];
  attendance: AttendanceRecord[];

  register: (user: Omit<User, 'id' | 'createdAt'>) => { success: boolean; error?: string };
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;

  addStudent: (student: Omit<Student, 'id' | 'createdAt' | 'createdBy'>) => { success: boolean; error?: string };
  updateStudent: (id: string, updates: Partial<Pick<Student, 'fullName' | 'gradeLevel' | 'gender' | 'studentId'>>) => void;
  deleteStudent: (id: string) => void;
  getStudentsForUser: () => Student[];

  recordAttendance: (studentId: string, studentName: string, gradeLevel: GradeLevel) => { success: boolean; status?: AttendanceStatus; error?: string };
  getAttendanceForUser: () => AttendanceRecord[];
}

const generateId = () => crypto.randomUUID();

// Simple hash (not cryptographic, but sufficient for localStorage demo)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + btoa(str).slice(0, 8);
};

const loadState = (key: string, fallback: any) => {
  try {
    const data = localStorage.getItem(`edutrack_${key}`);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
};

const saveState = (key: string, data: any) => {
  localStorage.setItem(`edutrack_${key}`, JSON.stringify(data));
};

export const useStore = create<AppState>((set, get) => ({
  users: loadState('users', []),
  currentUser: loadState('currentUser', null),
  students: loadState('students', []),
  attendance: loadState('attendance', []),

  register: (userData) => {
    const { users } = get();
    if (users.find(u => u.username === userData.username)) {
      return { success: false, error: 'Username already exists' };
    }
    if (users.find(u => u.email === userData.email)) {
      return { success: false, error: 'Email already registered' };
    }
    const newUser: User = {
      ...userData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...users, newUser];
    set({ users: updated });
    saveState('users', updated);
    return { success: true };
  },

  login: (username, password) => {
    const { users } = get();
    const hash = simpleHash(password);
    const user = users.find(u => u.username === username && u.passwordHash === hash);
    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }
    set({ currentUser: user });
    saveState('currentUser', user);
    return { success: true };
  },

  logout: () => {
    set({ currentUser: null });
    localStorage.removeItem('edutrack_currentUser');
  },

  addStudent: (studentData) => {
    const { students, currentUser } = get();
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    if (students.find(s => s.studentId === studentData.studentId)) {
      return { success: false, error: 'Student ID already exists' };
    }
    const newStudent: Student = {
      ...studentData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
    };
    const updated = [...students, newStudent];
    set({ students: updated });
    saveState('students', updated);
    return { success: true };
  },

  updateStudent: (id, updates) => {
    const { students } = get();
    const updated = students.map(s => s.id === id ? { ...s, ...updates } : s);
    set({ students: updated });
    saveState('students', updated);
  },

  deleteStudent: (id) => {
    const { students } = get();
    const updated = students.filter(s => s.id !== id);
    set({ students: updated });
    saveState('students', updated);
  },

  getStudentsForUser: () => {
    const { students, currentUser } = get();
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return students;
    return students.filter(s => s.gradeLevel === currentUser.gradeLevel);
  },

  recordAttendance: (studentId, studentName, gradeLevel) => {
    const { attendance } = get();
    const today = new Date().toLocaleDateString('en-CA');
    const existing = attendance.find(a => a.studentId === studentId && a.date === today);
    if (existing) {
      return { success: false, error: 'Attendance already recorded for this student today' };
    }
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let status: AttendanceStatus = 'Present';
    if (hours > 7 || (hours === 7 && minutes >= 31)) {
      status = 'Late';
    }

    const record: AttendanceRecord = {
      id: generateId(),
      studentId,
      studentName,
      gradeLevel,
      date: today,
      timeScanned: timeStr,
      status,
    };
    const updated = [...attendance, record];
    set({ attendance: updated });
    saveState('attendance', updated);
    return { success: true, status };
  },

  getAttendanceForUser: () => {
    const { attendance, currentUser } = get();
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return attendance;
    return attendance.filter(a => a.gradeLevel === currentUser.gradeLevel);
  },
}));

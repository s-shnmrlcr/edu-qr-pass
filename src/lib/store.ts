import { create } from 'zustand';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// This store is responsible for auth + local data.
// Auth is backed by Supabase so users can sign in from any device.

export type Role = 'admin' | 'teacher';
export type GradeLevel = 'Grade 7' | 'Grade 8' | 'Grade 9' | 'Grade 10' | 'Grade 11' | 'Grade 12';
export type Gender = 'Male' | 'Female';
export type AttendanceStatus = 'Present' | 'Late' | 'Absent';

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
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
  authInitializing: boolean;
  currentUser: User | null;
  students: Student[];
  attendance: AttendanceRecord[];

  register: (user: Omit<User, 'id' | 'createdAt'> & { password: string }) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;

  addStudent: (student: Omit<Student, 'id' | 'createdAt' | 'createdBy'>) => Promise<{ success: boolean; error?: string }>;
  updateStudent: (id: string, updates: Partial<Pick<Student, 'fullName' | 'gradeLevel' | 'gender' | 'studentId'>>) => Promise<{ success: boolean; error?: string }>;
  deleteStudent: (id: string) => Promise<{ success: boolean; error?: string }>;
  getStudentsForUser: () => Student[];

  recordAttendance: (studentId: string, studentName: string, gradeLevel: GradeLevel) => Promise<{ success: boolean; status?: AttendanceStatus; error?: string }>;
  getAttendanceForUser: () => AttendanceRecord[];
}

const generateId = () => crypto.randomUUID();

const loadState = <T>(key: string, fallback: T): T => {
  try {
    const data = localStorage.getItem(`edutrack_${key}`);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
};

const saveState = (key: string, data: unknown) => {
  localStorage.setItem(`edutrack_${key}`, JSON.stringify(data));
};

const mapSupabaseUser = (supabaseUser: SupabaseUser | null): User | null => {
  if (!supabaseUser) return null;
  const metadata = (supabaseUser.user_metadata ?? {}) as Record<string, unknown>;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    fullName: (metadata.fullName as string) ?? '',
    username: (metadata.username as string) ?? '',
    role: (metadata.role as Role) ?? 'teacher',
    gradeLevel: (metadata.gradeLevel as GradeLevel) ?? undefined,
    createdAt: supabaseUser.created_at ?? new Date().toISOString(),
  };
};

const getEmailForUsername = async (username: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('username', username)
    .limit(1)
    .single();

  if (error) {
    console.warn('Failed to resolve username to email', error.message);
    return null;
  }

  return data?.email ?? null;
};

interface StudentRow {
  id: string;
  student_id: string;
  full_name: string;
  grade_level: string;
  gender: string;
  created_at: string;
  created_by: string;
}

interface AttendanceRow {
  id: string;
  student_id: string;
  student_name: string;
  grade_level: string;
  date: string;
  time_scanned: string;
  status: string;
  created_at: string;
}

interface StudentUpdateData {
  full_name?: string;
  student_id?: string;
  grade_level?: string;
  gender?: string;
}

const mapStudentRow = (row: StudentRow): Student => ({
  id: row.id,
  studentId: row.student_id,
  fullName: row.full_name,
  gradeLevel: row.grade_level,
  gender: row.gender,
  createdAt: row.created_at,
  createdBy: row.created_by,
});

const mapAttendanceRow = (row: AttendanceRow): AttendanceRecord => ({
  id: row.id,
  studentId: row.student_id,
  studentName: row.student_name,
  gradeLevel: row.grade_level,
  date: row.date,
  timeScanned: row.time_scanned,
  status: row.status,
});

const fetchStudentsForUser = async (user: User | null): Promise<Student[]> => {
  if (!user) return [];

  const query = supabase.from('students').select('*').order('created_at', { ascending: false });
  if (user.role !== 'admin' && user.gradeLevel) {
    query.eq('grade_level', user.gradeLevel);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to load students:', error.message);
    return [];
  }
  return (data ?? []).map(mapStudentRow);
};

const fetchAttendanceForUser = async (user: User | null): Promise<AttendanceRecord[]> => {
  if (!user) return [];

  const query = supabase.from('attendance').select('*').order('date', { ascending: false }).order('time_scanned', { ascending: false });
  if (user.role !== 'admin' && user.gradeLevel) {
    query.eq('grade_level', user.gradeLevel);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to load attendance:', error.message);
    return [];
  }
  return (data ?? []).map(mapAttendanceRow);
};

export const useStore = create<AppState>((set, get) => {
  const syncUserData = async (user: User | null) => {
    if (!user) {
      set({ currentUser: null, students: [], attendance: [] });
      saveState('students', []);
      saveState('attendance', []);
      return;
    }

    const [students, attendance] = await Promise.all([
      fetchStudentsForUser(user),
      fetchAttendanceForUser(user),
    ]);

    set({ currentUser: user, students, attendance });
    saveState('students', students);
    saveState('attendance', attendance);
  };

  const initAuth = async () => {
    const { data } = await supabase.auth.getSession();
    const user = mapSupabaseUser(data.session?.user ?? null);
    await syncUserData(user);
    set({ authInitializing: false });
  };

  supabase.auth.onAuthStateChange((_, session) => {
    const user = mapSupabaseUser(session?.user ?? null);
    void syncUserData(user);
  });

  initAuth().catch(() => set({ authInitializing: false }));

  return {
    authInitializing: true,
    currentUser: null,
    students: loadState('students', []),
    attendance: loadState('attendance', []),

    register: async (userData) => {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            fullName: userData.fullName,
            username: userData.username,
            role: userData.role,
            gradeLevel: userData.gradeLevel,
          },
        },
      });

      if (error) return { success: false, error: error.message };

      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: userData.email,
          username: userData.username,
          role: userData.role,
          grade_level: userData.gradeLevel,
        });

        const user = mapSupabaseUser(data.user);
        await syncUserData(user);
      }

      return { success: true };
    },

    login: async (emailOrUsername, password) => {
      const email = emailOrUsername.includes('@')
        ? emailOrUsername
        : (await getEmailForUsername(emailOrUsername)) ?? emailOrUsername;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { success: false, error: error.message };

      if (data.user) {
        const user = mapSupabaseUser(data.user);
        await syncUserData(user);
      }

      return { success: true };
    },

    logout: async () => {
      await supabase.auth.signOut();
      await syncUserData(null);
    },

    addStudent: async (studentData) => {
      const currentUser = get().currentUser;
      if (!currentUser) return { success: false, error: 'Not authenticated' };

      const { data: existing, error: existingError } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', studentData.studentId)
        .limit(1);
      if (existingError) {
        console.error('Failed to validate student ID uniqueness:', existingError.message);
      }
      if (existing && existing.length > 0) {
        return { success: false, error: 'Student ID already exists' };
      }

      const { data, error } = await supabase
        .from('students')
        .insert({
          student_id: studentData.studentId,
          full_name: studentData.fullName,
          grade_level: studentData.gradeLevel,
          gender: studentData.gender,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (error || !data) {
        return { success: false, error: error?.message ?? 'Failed to add student' };
      }

      const student = mapStudentRow(data as StudentRow);
      const updated = [...get().students, student];
      set({ students: updated });
      saveState('students', updated);
      return { success: true };
    },

    updateStudent: async (id, updates) => {
      const dbData: StudentUpdateData = {};
      if (updates.fullName !== undefined) dbData.full_name = updates.fullName;
      if (updates.studentId !== undefined) dbData.student_id = updates.studentId;
      if (updates.gradeLevel !== undefined) dbData.grade_level = updates.gradeLevel;
      if (updates.gender !== undefined) dbData.gender = updates.gender;

      const { data, error } = await supabase
        .from('students')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        return { success: false, error: error?.message ?? 'Failed to update student' };
      }

      const updatedStudent = mapStudentRow(data as StudentRow);
      const updated = get().students.map(s => (s.id === id ? updatedStudent : s));
      set({ students: updated });
      saveState('students', updated);
      return { success: true };
    },

    deleteStudent: async (id) => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }
      const updated = get().students.filter(s => s.id !== id);
      set({ students: updated });
      saveState('students', updated);
      return { success: true };
    },

    getStudentsForUser: () => {
      const { students, currentUser } = get();
      if (!currentUser) return [];
      if (currentUser.role === 'admin') return students;
      return students.filter(s => s.gradeLevel === currentUser.gradeLevel);
    },

    recordAttendance: async (studentId, studentName, gradeLevel) => {
      const today = new Date().toLocaleDateString('en-CA');

      const { data: existing, error: existingError } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('date', today)
        .limit(1);

      if (existingError) {
        console.error('Failed to check existing attendance:', existingError.message);
      }

      if (existing && existing.length > 0) {
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

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          student_id: studentId,
          student_name: studentName,
          grade_level: gradeLevel,
          date: today,
          time_scanned: timeStr,
          status,
        })
        .select()
        .single();

      if (error || !data) {
        return { success: false, error: error?.message ?? 'Failed to record attendance' };
      }

      const record = mapAttendanceRow(data as AttendanceRow);
      const updated = [...get().attendance, record];
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
  };
});

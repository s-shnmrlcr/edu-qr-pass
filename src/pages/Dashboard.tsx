import { useStore } from '@/lib/store';
import { Users, UserCheck, Clock, UserX } from 'lucide-react';
import { useMemo } from 'react';

const Dashboard = () => {
  const currentUser = useStore(s => s.currentUser);
  const allStudents = useStore(s => s.students);
  const allAttendance = useStore(s => s.attendance);

  const students = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allStudents;
    return allStudents.filter(s => s.gradeLevel === currentUser.gradeLevel);
  }, [allStudents, currentUser]);

  const attendance = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return allAttendance;
    return allAttendance.filter(a => a.gradeLevel === currentUser.gradeLevel);
  }, [allAttendance, currentUser]);

  const today = new Date().toLocaleDateString('en-CA');

  const stats = useMemo(() => {
    const todayRecords = attendance.filter(a => a.date === today);
    const present = todayRecords.filter(a => a.status === 'Present').length;
    const late = todayRecords.filter(a => a.status === 'Late').length;
    const scannedIds = new Set(todayRecords.map(a => a.studentId));
    const absent = students.filter(s => !scannedIds.has(s.studentId)).length;
    return { total: students.length, present, late, absent };
  }, [students, attendance, today]);

  const recentRecords = useMemo(() => {
    return [...attendance].sort((a, b) => b.date.localeCompare(a.date) || b.timeScanned.localeCompare(a.timeScanned)).slice(0, 10);
  }, [attendance]);

  const statCards = [
    { label: 'Total Students', value: stats.total, icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Present Today', value: stats.present, icon: UserCheck, color: 'text-status-present', bg: 'bg-emerald-50' },
    { label: 'Late Today', value: stats.late, icon: Clock, color: 'text-status-late', bg: 'bg-amber-50' },
    { label: 'Absent Today', value: stats.absent, icon: UserX, color: 'text-status-absent', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of today's attendance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="card-stat">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Attendance rate bar */}
      <div className="bg-card rounded-xl border p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Today's Attendance Rate</h3>
        {stats.total > 0 ? (
          <div className="space-y-3">
            <div className="flex h-4 rounded-full overflow-hidden bg-muted">
              {stats.present > 0 && <div className="bg-status-present transition-all" style={{ width: `${(stats.present / stats.total) * 100}%` }} />}
              {stats.late > 0 && <div className="bg-status-late transition-all" style={{ width: `${(stats.late / stats.total) * 100}%` }} />}
              {stats.absent > 0 && <div className="bg-status-absent transition-all" style={{ width: `${(stats.absent / stats.total) * 100}%` }} />}
            </div>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-status-present" /> Present {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-status-late" /> Late {stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0}%</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-status-absent" /> Absent {stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0}%</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No students registered yet.</p>
        )}
      </div>

      {/* Recent records */}
      <div className="bg-card rounded-xl border">
        <div className="p-6 border-b">
          <h3 className="text-sm font-semibold text-foreground">Recent Attendance</h3>
        </div>
        {recentRecords.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No attendance records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Grade</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{r.studentName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.gradeLevel}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.date}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.timeScanned}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'Present' ? 'status-present' : r.status === 'Late' ? 'status-late' : 'status-absent'}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

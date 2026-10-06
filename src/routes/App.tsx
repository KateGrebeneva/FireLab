import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileQuestion,
  History as HistoryIcon,
  LayoutDashboard,
  Settings as SettingsIcon,
  UserRound,
  Users,
} from 'lucide-react'
import { AuthProvider, Guard } from '../lib/auth'
import { isConfigured } from '../lib/supabase'
import { SettingsProvider } from '../hooks/useSettings'
import { ToastProvider } from '../components/ui/Toast'
import { ConfirmProvider } from '../components/ui/Confirm'
import { PageLoader } from '../components/ui/Loader'
import AppShell, { type NavItem } from '../layouts/AppShell'
import Landing from '../pages/Landing'
import Login from '../pages/Login'
import NotFound from '../pages/NotFound'
import ConfigMissing from '../pages/ConfigMissing'

// Кабинеты загружаются лениво — лендинг открывается быстрее
const EmployeeHome = lazy(() => import('../pages/employee/EmployeeHome'))
const Quiz = lazy(() => import('../pages/employee/Quiz'))
const MyHistory = lazy(() => import('../pages/employee/MyHistory'))
const AttemptReview = lazy(() => import('../pages/shared/AttemptReview'))
const Dashboard = lazy(() => import('../pages/admin/Dashboard'))
const Employees = lazy(() => import('../pages/admin/Employees'))
const EmployeeProfile = lazy(() => import('../pages/admin/EmployeeProfile'))
const Questions = lazy(() => import('../pages/admin/Questions'))
const Stats = lazy(() => import('../pages/admin/Stats'))
const Results = lazy(() => import('../pages/admin/Results'))
const Settings = lazy(() => import('../pages/admin/Settings'))
const Account = lazy(() => import('../pages/shared/Account'))

const employeeNav: NavItem[] = [
  { to: '/employee', label: 'Главная', icon: LayoutDashboard, end: true },
  { to: '/employee/training', label: 'Тренировка', icon: BookOpen },
  { to: '/employee/exam', label: 'Экзамен', icon: ClipboardCheck },
  { to: '/employee/history', label: 'Мои результаты', icon: HistoryIcon },
  { to: '/employee/account', label: 'Мой профиль', icon: UserRound },
]

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Главная', icon: LayoutDashboard, end: true },
  { to: '/admin/employees', label: 'Сотрудники', icon: Users },
  { to: '/admin/questions', label: 'Вопросы', icon: FileQuestion },
  { to: '/admin/stats', label: 'Статистика', icon: BarChart3 },
  { to: '/admin/results', label: 'Результаты', icon: ClipboardList },
  { to: '/admin/settings', label: 'Настройки', icon: SettingsIcon },
  { to: '/admin/account', label: 'Мой профиль', icon: UserRound },
]

export default function App() {
  if (!isConfigured) return <ConfigMissing />
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <SettingsProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />

                  <Route element={<Guard role="employee" />}>
                    <Route element={<AppShell items={employeeNav} section="Сотрудник" />}>
                      <Route path="/employee" element={<EmployeeHome />} />
                      <Route path="/employee/training" element={<Quiz kind="training" />} />
                      <Route path="/employee/exam" element={<Quiz kind="exam" />} />
                      <Route path="/employee/history" element={<MyHistory />} />
                      <Route path="/employee/history/:id" element={<AttemptReview />} />
                      <Route path="/employee/account" element={<Account />} />
                    </Route>
                  </Route>

                  <Route element={<Guard role="admin" />}>
                    <Route element={<AppShell items={adminNav} section="Администратор" />}>
                      <Route path="/admin" element={<Dashboard />} />
                      <Route path="/admin/employees" element={<Employees />} />
                      <Route path="/admin/employees/:id" element={<EmployeeProfile />} />
                      <Route path="/admin/questions" element={<Questions />} />
                      <Route path="/admin/stats" element={<Stats />} />
                      <Route path="/admin/results" element={<Results />} />
                      <Route path="/admin/results/:id" element={<AttemptReview />} />
                      <Route path="/admin/settings" element={<Settings />} />
                      <Route path="/admin/account" element={<Account />} />
                    </Route>
                  </Route>

                  <Route path="/employee/*" element={<Navigate to="/employee" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </SettingsProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

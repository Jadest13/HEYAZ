import { SettingsScreen } from '../screens/SettingsScreen/index.web';
import { typography as t } from '@heyaz/app/styles/typography';
import { LoginModal } from '../components/auth/LoginModal.web';
import { MyPage } from '../screens/MyPage/index.web';
import { DesignSystem } from '../screens/DesignSystem/index.web';
import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Flame,
  HeartPulse,
  House,
  MessageCircle,
  Plus,
  Settings,
  User,
  X,
} from 'lucide-react';
import { colors as c } from '@heyaz/app/styles/index';
import { useApp } from '@heyaz/app/hooks/useApp';
import { Button, Card, Muted, Row, Tag } from '@heyaz/app/components/common/ui.web';
import { HomeScreen } from '@heyaz/app/screens/HomeScreen/index.web';
import { PlanScreen } from '../screens/PlanScreen/PlanView.web';
import { WorkoutScreen, WorkoutResultScreen } from '@heyaz/app/screens/WorkoutScreen/index.web';
import { CoachScreen } from '@heyaz/app/screens/CoachScreen/index.web';
import { HistoryScreen, AnalyticsScreen } from '@heyaz/app/screens/HistoryScreen/index.web';
import { BodyScreen, ProfileScreen } from '@heyaz/app/screens/ProfileScreen/index.web';
import {
  BurningScreen,
  BurningSetupScreen,
  BurningResultScreen,
} from '@heyaz/app/screens/BurningDayScreen/index.web';
const AssessmentScreen = lazy(() =>
  import('../screens/AssessmentScreen/index.web').then((m) => ({ default: m.AssessmentScreen })),
);
const PlanEditScreen = lazy(() =>
  import('../screens/PlanScreen/index.web').then((m) => ({ default: m.PlanEditScreen })),
);
const Shell = styled.div`
  padding-left: 252px;
  min-height: 100vh;
  overflow-y: auto;
  @media (max-width: 1000px) {
    padding-left: 220px;
  }
  @media (max-width: 760px) {
    padding-left: 0;
    padding-bottom: 80px;
  }
`;
const Sidebar = styled.aside`
  background: ${c.surface};
  border-right: 1px solid ${c.border};
  padding: 35px 20px;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  width: 252px;
  overflow-y: auto;
  overscroll-behavior: contain;
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 25;
  @media (max-width: 1000px) {
    width: 220px;
  }
  @media (max-width: 760px) {
    display: none;
  }
`;
const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: ${t.heading}px;
  font-weight: 900;
  letter-spacing: -1.8px;
  padding: 0 14px 40px;
  svg {
    color: ${c.accent};
  }
`;
const Nav = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 13px 15px;
  border-radius: 10px;
  color: ${c.muted};
  font-size: ${t.body}px;
  font-weight: 600;
  margin: 3px 0;
  &.active {
    background: ${c.accentSoft};
    color: ${c.accent};
  }
  svg {
    width: 19px;
    height: 19px;
  }
`;
const Header = styled.header`
  height: 86px;
  border-bottom: 1px solid ${c.border};
  background: ${c.surface};
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  @media (max-width: 760px) {
    height: 65px;
    padding: 0 20px;
    > div:first-of-type > svg,
    > div:first-of-type > span:last-of-type,
    > div:last-of-type > span {
      display: none;
    }
  }
`;
const Main = styled.main`
  padding: 34px 40px;
  max-width: 1480px;
  margin: auto;
  @media (max-width: 1000px) {
    padding: 26px;
  }
  @media (max-width: 760px) {
    padding: 22px 16px;
  }
`;
const Bottom = styled.nav`
  display: none;
  @media (max-width: 760px) {
    display: flex;
    justify-content: space-around;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 20;
    background: ${c.surface};
    border-top: 1px solid ${c.border};
    padding: 8px 0 max(8px, env(safe-area-inset-bottom));
    a {
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      font-size: ${t.caption}px;
      margin: 0;
    }
  }
`;
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${c.overlay};
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 20px;
`;
const links = [
  { to: '/home', label: '홈', icon: House },
  { to: '/plan', label: '운동 계획', icon: CalendarDays },
  { to: '/ai-coach', label: 'AI 코치', icon: MessageCircle },
  { to: '/history', label: '운동 기록', icon: Activity },
  { to: '/analytics', label: '분석', icon: BarChart3 },
  { to: '/body', label: '신체 변화', icon: HeartPulse },
  { to: '/burning-day', label: 'Burning Day', icon: Flame },
];
const names: Record<string, string> = {
  home: '대시보드',
  plan: '운동 계획',
  'ai-coach': 'AI 코치',
  'my-page': '마이페이지',
  'design-system': '디자인 시스템',
  history: '운동 기록',
  analytics: '운동 분석',
  body: '신체 변화',
  profile: '마이 프로필',
  settings: '설정',
  assessment: '체력 확인',
  workout: '운동 실행',
  'burning-day': 'Burning Day',
  onboarding: '시작하기',
};
export default function App() {
  const { state, error, clearError } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(false);
  const [loggedIn, setLoggedIn] = useState(
    () => sessionStorage.getItem('heyaz:demo-login') === 'true',
  );
  const [loginOpen, setLoginOpen] = useState(false);
  useEffect(() => {
    const reset = () => {
      setLoggedIn(false);
    };
    window.addEventListener('heyaz:reset', reset);
    return () => window.removeEventListener('heyaz:reset', reset);
  }, []);
  const openMyPage = () => {
    if (loggedIn) navigate('/my-page');
    else setLoginOpen(true);
  };
  const logout = () => {
    sessionStorage.removeItem('heyaz:demo-login');
    setLoggedIn(false);
    navigate('/home');
  };
  const section = location.pathname.split('/')[1];
  return (
    <Shell>
      <Sidebar>
        <Logo>
          <Activity size={30} strokeWidth={3} />
          HEYAZ<span style={{ color: c.accent }}>.</span>
        </Logo>
        <Muted style={{ padding: '0 15px 12px', fontSize: t.caption, letterSpacing: 2 }}>
          YOUR FITNESS SPACE
        </Muted>
        <nav>
          {links.map((l) => (
            <Nav
              key={l.to}
              to={l.to}
              onClick={(e) => {
                if (l.to === '/my-page') {
                  e.preventDefault();
                  openMyPage();
                }
              }}
            >
              <l.icon />
              {l.label}
              {l.to === '/ai-coach' && (
                <Tag style={{ fontSize: t.caption, padding: '2px 4px' }}>AI</Tag>
              )}
            </Nav>
          ))}
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <Card
            style={{
              background: c.navy,
              color: c.onHero,
              border: 0,
              padding: 18,
              margin: '30px 0 20px',
            }}
          >
            <Flame color={c.accent} />
            <h3 style={{ fontSize: t.body, margin: '12px 0 7px' }}>작은 움직임, 큰 변화</h3>
            <p style={{ fontSize: t.caption, lineHeight: 1.8, opacity: 0.65 }}>
              일상 사이사이, Burning Day로
              <br />
              움직이는 습관을 만들어보세요.
            </p>
            <button
              onClick={() => navigate('/burning-day/setup')}
              style={{
                border: 0,
                background: 'transparent',
                color: c.onHero,
                padding: 0,
                cursor: 'pointer',
                fontSize: t.caption,
              }}
            >
              자세히 알아보기 ↗
            </button>
          </Card>
          <Nav to="/settings">
            <Settings />
            설정
          </Nav>
          <Nav
            to="/my-page"
            onClick={(e) => {
              e.preventDefault();
              openMyPage();
            }}
          >
            <User />
            {loggedIn ? '마이페이지' : '로그인'}
          </Nav>
          <Nav
            to="/profile"
            aria-label="개인 프로필 열기"
            style={{ padding: '15px 10px', borderTop: `1px solid ${c.border}`, marginTop: 12 }}
          >
            <User size={28} color={c.muted} />
            <div>
              <strong>{loggedIn ? state.profile.name : '게스트'}</strong>
              <div>
                <Muted style={{ fontSize: t.caption }}>MY FITNESS JOURNEY</Muted>
              </div>
            </div>
            <ChevronRight size={15} style={{ marginLeft: 'auto' }} />
          </Nav>
        </div>
      </Sidebar>
      <div style={{ minWidth: 0 }}>
        <Header>
          <Row>
            <span style={{ fontWeight: 650 }}>{names[section] ?? 'HEYAZ'}</span>
            <ChevronRight size={13} color={c.muted} />
            <Muted>나의 건강한 일상</Muted>
          </Row>
          <Row>
            <Tag tone="green">● 로컬 저장</Tag>
            <button
              aria-label="알림 열기"
              onClick={() => setNotifications(true)}
              style={{ background: 'none', border: 0, padding: 9, cursor: 'pointer' }}
            >
              <Bell size={19} />
            </button>
            <Button
              variant="ghost"
              onClick={() => navigate('/profile')}
              style={{ borderRadius: 40, padding: 9 }}
            >
              <User size={18} />
              프로필
            </Button>
          </Row>
        </Header>
        <Main>
          {error && (
            <Card role="alert" style={{ color: c.danger, marginBottom: 20 }}>
              {error}
              <Button variant="ghost" onClick={clearError}>
                닫기
              </Button>
            </Card>
          )}
          <Suspense fallback={<Card role="status">화면을 준비하고 있어요…</Card>}>
            <Routes>
              <Route
                path="/"
                element={
                  <Navigate to={state.profile.onboarded ? '/home' : '/onboarding'} replace />
                }
              />
              <Route path="/onboarding" element={<ProfileScreen onboarding />} />
              <Route path="/home" element={<HomeScreen />} />
              <Route path="/plan" element={<PlanScreen />} />
              <Route path="/plan/edit" element={<PlanEditScreen />} />
              <Route path="/ai-coach" element={<CoachScreen />} />
              <Route path="/coach" element={<Navigate to="/ai-coach" replace />} />
              <Route
                path="/design-system"
                element={<Navigate to="/design-system/typography" replace />}
              />
              <Route path="/design-system/:section" element={<DesignSystem />} />
              <Route
                path="/my-page"
                element={
                  <MyPage
                    loggedIn={loggedIn}
                    onLogin={() => setLoginOpen(true)}
                    onLogout={logout}
                  />
                }
              />
              <Route path="/workout" element={<WorkoutScreen />} />
              <Route path="/workout/:sessionId/result" element={<WorkoutResultScreen />} />
              <Route path="/history" element={<HistoryScreen />} />
              <Route path="/history/:sessionId" element={<WorkoutResultScreen />} />
              <Route path="/analytics" element={<AnalyticsScreen />} />
              <Route path="/body" element={<BodyScreen />} />
              <Route path="/profile" element={<ProfileScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/assessment" element={<AssessmentScreen />} />
              <Route path="/burning-day/setup" element={<BurningSetupScreen />} />
              <Route path="/burning-day" element={<BurningScreen />} />
              <Route path="/burning-day/:sessionId/exercise/:eventId" element={<BurningScreen />} />
              <Route path="/burning-day/:sessionId/result" element={<BurningResultScreen />} />
              <Route
                path="*"
                element={
                  <Card>
                    <h2>페이지를 찾을 수 없어요</h2>
                    <Button onClick={() => navigate('/home')}>홈으로 이동</Button>
                  </Card>
                }
              />
            </Routes>
          </Suspense>
          <footer
            style={{
              marginTop: 36,
              paddingTop: 20,
              borderTop: `1px solid ${c.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: t.caption,
              color: c.muted,
            }}
          >
            <span>HEYAZ · EVERY MOVE COUNTS</span>
            <span>어제보다 조금 더, 나답게.</span>
          </footer>
        </Main>
      </div>
      <Bottom>
        {[
          ...links.slice(0, 4),
          { to: '/my-page', label: loggedIn ? '마이' : '로그인', icon: User },
        ].map((l) => (
          <Nav
            key={l.to}
            to={l.to}
            onClick={(e) => {
              if (l.to === '/my-page') {
                e.preventDefault();
                openMyPage();
              }
            }}
          >
            <l.icon />
            {l.label}
          </Nav>
        ))}
      </Bottom>
      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onLogin={() => {
            sessionStorage.setItem('heyaz:demo-login', 'true');
            setLoggedIn(true);
            setLoginOpen(false);
            navigate('/my-page');
          }}
        />
      )}
      {notifications && (
        <Overlay onClick={() => setNotifications(false)}>
          <Card
            role="dialog"
            aria-modal="true"
            aria-label="알림"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 430, width: '100%' }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <h2>알림</h2>
              <Button
                variant="ghost"
                aria-label="알림 닫기"
                onClick={() => setNotifications(false)}
              >
                <X size={16} />
              </Button>
            </Row>
            <p>오늘의 운동 계획과 Burning Day 일정을 확인해보세요.</p>
            <Muted>
              백그라운드 Push 알림은 아직 연결되지 않았습니다. 운동 중 휴식 타이머는 앱에서
              동작합니다.
            </Muted>
            <Row style={{ marginTop: 20 }}>
              <Button
                onClick={() => {
                  setNotifications(false);
                  navigate('/plan');
                }}
              >
                <Dumbbell size={16} />
                계획 보기
              </Button>
              <Button
                variant="soft"
                onClick={() => {
                  setNotifications(false);
                  navigate('/burning-day');
                }}
              >
                <Plus size={16} />
                Burning Day
                <ArrowUpRight size={14} />
              </Button>
            </Row>
          </Card>
        </Overlay>
      )}
    </Shell>
  );
}

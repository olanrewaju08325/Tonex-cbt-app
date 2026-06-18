import { createBrowserRouter, Outlet } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { UpdatePasswordPage } from "./pages/UpdatePasswordPage";
import { Dashboard } from "./pages/Dashboard";
import { PracticePage } from "./pages/PracticePage";
import { ExamPage } from "./pages/ExamPage";
import { ResultsPage } from "./pages/ResultsPage";
import { ReviewPage } from "./pages/ReviewPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { PremiumPage } from "./pages/PremiumPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminPage } from "./pages/AdminPage";
import { BookmarksPage } from "./pages/BookmarksPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { MaterialsPage } from "./pages/MaterialsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { SubscriptionPage } from "./pages/SubscriptionPage";
import { SettingsPage } from "./pages/SettingsPage";
import { FullExamPage } from "./pages/FullExamPage";
import { ChallengesPage } from "./pages/ChallengesPage";
import { ChallengeAttemptPage } from "./pages/ChallengeAttemptPage";
import { SchedulerPage } from "./pages/SchedulerPage";
import { FlashcardsPage } from "./pages/FlashcardsPage";
import { AggregateCalculatorPage } from "./pages/AggregateCalculatorPage";
import { CutOffMarksPage } from "./pages/CutOffMarksPage";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AdminRoute } from "../components/AdminRoute";

export const router = createBrowserRouter([
  { path: "/", Component: LandingPage },
  { path: "/login", Component: LoginPage },
  { path: "/register", Component: RegisterPage },
  { path: "/update-password", Component: UpdatePasswordPage },
  { 
    path: "/tonexadmin-2007", 
    element: <AdminRoute><AdminPage /></AdminRoute> 
  },
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: "/dashboard", Component: Dashboard },
      { path: "/practice", Component: PracticePage },
      { path: "/exam", Component: ExamPage },
      { path: "/results", Component: ResultsPage },
      { path: "/review", Component: ReviewPage },
      { path: "/leaderboard", Component: LeaderboardPage },
      { path: "/premium", Component: PremiumPage },
      { path: "/profile", Component: ProfilePage },
      { path: "/bookmarks", Component: BookmarksPage },
      { path: "/analytics", Component: AnalyticsPage },
      { path: "/materials", Component: MaterialsPage },
      { path: "/notifications", Component: NotificationsPage },
      { path: "/privacy", Component: PrivacyPage },
      { path: "/subscription", Component: SubscriptionPage },
      { path: "/settings", Component: SettingsPage },
      { path: "/full-exam", Component: FullExamPage },
      { path: "/challenges", Component: ChallengesPage },
      { path: "/challenge/:id", Component: ChallengeAttemptPage },
      { path: "/scheduler", Component: SchedulerPage },
      { path: "/flashcards", Component: FlashcardsPage },
      { path: "/aggregate-calculator", Component: AggregateCalculatorPage },
      { path: "/cut-offs", Component: CutOffMarksPage },
    ],
  },
  { path: "*", Component: NotFoundPage },
]);

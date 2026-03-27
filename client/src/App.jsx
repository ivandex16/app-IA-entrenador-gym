import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import GuidedTour from './components/GuidedTour';
import { useAuth } from './context/AuthContext';


import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Routines from './pages/Routines';
import RoutineDetail from './pages/RoutineDetail';
import Workouts from './pages/Workouts';
import Exercises from './pages/Exercises';
import ExerciseDetail from './pages/ExerciseDetail';
import Goals from './pages/Goals';
import Progress from './pages/Progress';
import Recommendations from './pages/Recommendations';
import FitRecipes from './pages/FitRecipes';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import CoachingHub from './pages/CoachingHub';

export default function App() {
  const { user, setUser } = useAuth();
  const [tourActive, setTourActive] = useState(false);

  // Auto-start tour for new users who haven't completed it
  useEffect(() => {
    if (user && user.tourCompleted === false) {
      setTourActive(true);
    }
  }, [user]);

  const startTour = () => setTourActive(true);
  const finishTour = () => {
    setTourActive(false);
    if (user) setUser((prev) => ({ ...prev, tourCompleted: true }));
  };

  return (
    <>
      <Toaster position="top-right" />
      <Navbar onStartTour={startTour} />
      <GuidedTour active={tourActive} onFinish={finishTour} />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />

        {/* Protected */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/routines" element={<ProtectedRoute><Routines /></ProtectedRoute>} />
        <Route path="/routines/:id" element={<ProtectedRoute><RoutineDetail /></ProtectedRoute>} />
        <Route path="/workouts" element={<ProtectedRoute><Workouts /></ProtectedRoute>} />
        <Route path="/exercises" element={<ProtectedRoute><Exercises /></ProtectedRoute>} />
        <Route path="/exercises/:id" element={<ProtectedRoute><ExerciseDetail /></ProtectedRoute>} />
        <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
        <Route path="/fit-recipes" element={<ProtectedRoute><FitRecipes /></ProtectedRoute>} />
        <Route path="/coaching" element={<ProtectedRoute><CoachingHub /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

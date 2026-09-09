import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CoursesPage from './pages/CoursesPage';
import FileCourseRouter from './pages/FileCourseRouter';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/" replace />} />
          <Route path="/" element={<CoursesPage />} />
          <Route path="/course/:id" element={<Navigate to="/" replace />} />
          <Route path="/file-course/:slug" element={<FileCourseRouter />} />
          <Route path="/file-course/:slug/:lessonSlug" element={<FileCourseRouter />} />
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/admin/*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProblemListPage from './pages/ProblemListPage';
import ProblemDetailPage from './pages/ProblemDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/problems" replace />} />
          <Route path="/problems" element={<ProblemListPage />} />
          <Route path="/problems/:problemId" element={<ProblemDetailPage />} />
          <Route
            path="/problems/:problemId/:section"
            element={<ProblemDetailPage />}
          />
          <Route path="*" element={<Navigate to="/problems" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

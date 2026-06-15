import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import Guests from '@/pages/Guests';
import Tables from '@/pages/Tables';
import Schedule from '@/pages/Schedule';
import Items from '@/pages/Items';
import Budget from '@/pages/Budget';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/guests" replace />} />
        <Route path="/guests" element={<Guests />} />
        <Route path="/tables" element={<Tables />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/items" element={<Items />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="*" element={<Navigate to="/guests" replace />} />
      </Routes>
    </Layout>
  );
}

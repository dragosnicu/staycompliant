import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login          from './pages/Login';
import Register       from './pages/Register';
import Dashboard      from './pages/Dashboard';
import PropertyDetail from './pages/PropertyDetail';
import AddProperty    from './pages/AddProperty';
import AddPermit      from './pages/AddPermit';
import BookingLog     from './pages/BookingLog';
import DocumentVault  from './pages/DocumentVault';
import Billing        from './pages/Billing';
import Onboarding     from './pages/Onboarding';

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/billing"  element={<PrivateRoute><Billing /></PrivateRoute>} />
        <Route path="/properties/add" element={<PrivateRoute><AddProperty /></PrivateRoute>} />
        <Route path="/properties/:id" element={<PrivateRoute><PropertyDetail /></PrivateRoute>} />
        <Route path="/properties/:propertyId/permits/add" element={<PrivateRoute><AddPermit /></PrivateRoute>} />
        <Route path="/properties/:propertyId/bookings"    element={<PrivateRoute><BookingLog /></PrivateRoute>} />
        <Route path="/properties/:propertyId/documents"   element={<PrivateRoute><DocumentVault /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

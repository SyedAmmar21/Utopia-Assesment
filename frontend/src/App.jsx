import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";

import DashboardLayout from "./layouts/DashboardLayout";

import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateOrder from "./pages/admin/CreateOrder";

import TechnicianDashboard from "./pages/technician/TechnicianDashboard";
import CompleteJob from "./pages/technician/CompleteJob";

import ManagerDashboard from "./pages/manager/ManagerDashboard";
import AIQuery from "./pages/manager/AIQuery";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Admin Routes */}
        <Route element={<DashboardLayout role="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route
            path="/admin/create-order"
            element={<CreateOrder />}
          />
        </Route>

        {/* Technician Routes */}
        <Route element={<DashboardLayout role="technician" />}>
          <Route
            path="/technician"
            element={<TechnicianDashboard />}
          />
          <Route
            path="/technician/complete-job"
            element={<CompleteJob />}
          />
        </Route>

        {/* Manager Routes */}
        <Route element={<DashboardLayout role="manager" />}>
          <Route
            path="/manager"
            element={<ManagerDashboard />}
          />
          <Route
            path="/manager/ai"
            element={<AIQuery />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
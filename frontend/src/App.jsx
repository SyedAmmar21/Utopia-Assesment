import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";

import DashboardLayout from "./layouts/DashboardLayout";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateOrder from "./pages/admin/CreateOrder";

// Technician
import TechnicianDashboard from "./pages/technician/TechnicianDashboard";
import CompleteJob from "./pages/technician/CompleteJob";

// Manager
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import AIQuery from "./pages/manager/AIQuery";
import ManagerJobDetails from "./pages/manager/ManagerJobDetails";
import KPI from "./pages/manager/KPI";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
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
            path="/technician/complete-job/:id"
            element={<CompleteJob />}
          />

          <Route
            path="/technician/complete-job"
            element={<TechnicianDashboard />}
          />

        </Route>

        {/* Manager Routes */}
        <Route element={<DashboardLayout role="manager" />}>
          <Route
            path="/manager"
            element={<ManagerDashboard />}
          />

          <Route
            path="/manager/job/:id"
            element={<ManagerJobDetails />}
          />

          <Route
            path="/manager/ai"
            element={<AIQuery />}
          />

          <Route
            path="/manager/kpi"
            element={<KPI />}
          />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
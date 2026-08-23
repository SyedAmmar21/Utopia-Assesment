import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";

import DashboardLayout from "./layouts/DashboardLayout";

// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import CreateOrder from "./pages/admin/CreateOrder";
import AdminOrders from "./pages/admin/AdminOrders";
import OrderDetails from "./pages/admin/OrderDetails";

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
        <Route path="/admin" element={<DashboardLayout role="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="create-order" element={<CreateOrder />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<OrderDetails />} />

          {/* Preserves the existing order-details URL. */}
          <Route path="order/:id" element={<OrderDetails />} />
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

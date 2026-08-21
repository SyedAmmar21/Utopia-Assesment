import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";

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

        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/create-order" element={<CreateOrder />} />

        <Route
          path="/technician"
          element={<TechnicianDashboard />}
        />
        <Route
          path="/technician/complete-job"
          element={<CompleteJob />}
        />

        <Route path="/manager" element={<ManagerDashboard />} />
        <Route path="/manager/ai" element={<AIQuery />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
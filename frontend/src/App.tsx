import { AnimatePresence } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserHome from "./pages/UserHome";
import Dashboard from "./pages/Dashboard";
import Health from "./pages/Health";
// import Food from "./pages/Food";
import Aqi from "./pages/Aqi";
import Analysis from "./pages/Analysis";
import Community from "./pages/Community";
import Pricing from "./pages/Pricing";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import InstantAlert from "./pages/InstantAlert";
import Report from "./pages/Report";
import HospitalLogin from "./pages/hospital/Login";
import HospitalRoleSelect from "./pages/hospital/RoleSelect";
import HospitalAdmin from "./pages/hospital/Admin";
import HospitalDoctor from "./pages/hospital/Doctor";
import HospitalNurse from "./pages/hospital/Nurse";
import HospitalStaffAccount from "./pages/hospital/StaffAccount";
import Doctors from "./pages/hospital/Doctors";
import Staff from "./pages/hospital/Staff";
import Resources from "./pages/hospital/Resources";
import Emergency from "./pages/hospital/Emergency";
import HospitalProfile from "./pages/hospital/Profile";
import HospitalSettings from "./pages/hospital/Settings";
import NotFound from "./pages/NotFound";
import PageTransition from "./components/PageTransition";
import ProtectedRoute from "./components/ProtectedRoute";
import HospitalRoleRoute from "./components/HospitalRoleRoute";
import { AuthProvider } from "./lib/authContext";

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="sync" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <Home />
            </PageTransition>
          }
        />
        <Route
          path="/home"
          element={
            <PageTransition>
              <Home />
            </PageTransition>
          }
        />
        <Route
          path="/index.html"
          element={
            <PageTransition>
              <Home />
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PageTransition>
              <Login />
            </PageTransition>
          }
        />
        <Route
          path="/about"
          element={
            <PageTransition>
              <About />
            </PageTransition>
          }
        />
        <Route
          path="/register"
          element={
            <PageTransition>
              <Register />
            </PageTransition>
          }
        />
        <Route
          path="/user-home"
          element={
            <ProtectedRoute>
              <PageTransition>
                <UserHome />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Dashboard />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/health"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Health />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        {/* <Route
          path="/food"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Food />
              </PageTransition>
            </ProtectedRoute>
          }
        /> */}
        <Route
          path="/aqi"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Aqi />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Analysis />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Report />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/community"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Community />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pricing"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Pricing />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Profile />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Settings />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/instant-alert"
          element={
            <ProtectedRoute>
              <PageTransition>
                <InstantAlert />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/patient" element={<Navigate to="/user-home" replace />} />
        <Route path="/patient/login" element={<Navigate to="/login" replace />} />
        <Route path="/patient/register" element={<Navigate to="/register" replace />} />
        <Route path="/patient/user-home" element={<Navigate to="/user-home" replace />} />
        <Route path="/patient/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/patient/health" element={<Navigate to="/health" replace />} />
        <Route path="/patient/food" element={<Navigate to="/food" replace />} />
        <Route path="/patient/aqi" element={<Navigate to="/aqi" replace />} />
        <Route path="/patient/analysis" element={<Navigate to="/analysis" replace />} />
        <Route path="/patient/report" element={<Navigate to="/report" replace />} />
        <Route path="/patient/community" element={<Navigate to="/community" replace />} />
        <Route path="/patient/pricing" element={<Navigate to="/pricing" replace />} />
        <Route path="/patient/instant-alert" element={<Navigate to="/instant-alert" replace />} />
        <Route path="/hospital" element={<Navigate to="/hospital/login" replace />} />
        <Route path="/doctor" element={<Navigate to="/hospital/doctor" replace />} />
        <Route path="/doctor/login" element={<Navigate to="/hospital/login" replace />} />
        <Route path="/hospital-login" element={<Navigate to="/hospital/login" replace />} />
        <Route
          path="/hospital/login"
          element={
            <PageTransition>
              <HospitalLogin />
            </PageTransition>
          }
        />
        <Route
          path="/hospital/role-select"
          element={
            <ProtectedRoute>
              <PageTransition>
                <HospitalRoleSelect />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/hospital/dashboard" element={<Navigate to="/hospital/admin" replace />} />
        <Route
          path="/hospital/admin"
          element={
            <ProtectedRoute>
              <HospitalRoleRoute allowedRoles={["admin"]}>
                <PageTransition>
                  <HospitalAdmin />
                </PageTransition>
              </HospitalRoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hospital/doctor"
          element={
            <ProtectedRoute>
              <HospitalRoleRoute allowedRoles={["doctor"]}>
                <PageTransition>
                  <HospitalDoctor />
                </PageTransition>
              </HospitalRoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hospital/nurse"
          element={
            <ProtectedRoute>
              <HospitalRoleRoute allowedRoles={["nurse"]}>
                <PageTransition>
                  <HospitalNurse />
                </PageTransition>
              </HospitalRoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hospital/staff-account"
          element={
            <ProtectedRoute>
              <HospitalRoleRoute allowedRoles={["staff"]}>
                <PageTransition>
                  <HospitalStaffAccount />
                </PageTransition>
              </HospitalRoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctors"
          element={<Navigate to="/hospital/doctors" replace />}
        />
        <Route
          path="/hospital/doctors"
          element={
            <ProtectedRoute>
              <HospitalRoleRoute allowedRoles={["admin"]}>
                <PageTransition>
                  <Doctors />
                </PageTransition>
              </HospitalRoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={<Navigate to="/hospital/staff" replace />}
        />
        <Route
          path="/hospital/staff"
          element={
            <ProtectedRoute>
              <HospitalRoleRoute allowedRoles={["admin"]}>
                <PageTransition>
                  <Staff />
                </PageTransition>
              </HospitalRoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/resources"
          element={<Navigate to="/hospital/resources" replace />}
        />
        <Route
          path="/hospital/resources"
          element={
            <ProtectedRoute>
              <HospitalRoleRoute>
                <PageTransition>
                  <Resources />
                </PageTransition>
              </HospitalRoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/emergency"
          element={<Navigate to="/hospital/emergency" replace />}
        />
        <Route
          path="/hospital/emergency"
          element={
            <ProtectedRoute>
              <HospitalRoleRoute>
                <PageTransition>
                  <Emergency />
                </PageTransition>
              </HospitalRoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hospital/profile"
          element={
            <ProtectedRoute>
              <HospitalRoleRoute>
                <PageTransition>
                  <HospitalProfile />
                </PageTransition>
              </HospitalRoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/hospital/settings"
          element={
            <ProtectedRoute>
              <HospitalRoleRoute>
                <PageTransition>
                  <HospitalSettings />
                </PageTransition>
              </HospitalRoleRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <PageTransition>
              <NotFound />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AnimatedRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;

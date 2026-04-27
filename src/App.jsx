import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";

function SafeOutlet() {
  return <ErrorBoundary><Outlet /></ErrorBoundary>;
}

// ── Layouts ───────────────────────────────────────────────────────────────────
import AdminLayout   from "./components/layout/AdminLayout";
import CompanyLayout from "./components/layout/CompanyLayout";
import ATLayout      from "./components/layout/ATLayout";
import UserLayout    from "./components/layout/UserLayout";
import StaffLayout   from "./components/layout/StaffLayout";

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginPage          from "./pages/auth/LoginPage";
import RegisterPage       from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage  from "./pages/auth/ResetPasswordPage";

// ── User / Public ─────────────────────────────────────────────────────────────
import ExplorePage            from "./pages/user/ExplorePage";
import SectionPage            from "./pages/user/SectionPage";
import LocationDetailPage     from "./pages/user/LocationDetailPage";
import LocationFormPage        from "./pages/company/LocationFormPage";
import TourSuggestionsPage    from "./pages/user/TourSuggestionsPage";
import TourDetailPage         from "./pages/user/TourDetailPage";
import TourProductListPage    from "./pages/user/TourProductListPage";   // MỚI
import TourProductDetailPage  from "./pages/user/TourProductDetailPage";  // MỚI
import MyTripsPage            from "./pages/user/MyTripsPage";            // MỚI
import TripPlannerPage        from "./pages/user/TripPlannerPage";        // MỚI
import SearchResultsPage      from "./pages/user/SearchResultsPage";
import ProfilePage            from "./pages/user/ProfilePage";
import UserBookingsPage       from "./pages/user/UserBookingsPage";
import UserBookingDetailPage  from "./pages/user/UserBookingDetailPage";
import PaymentPage            from "./pages/user/PaymentPage";
import PaymentResultPage      from "./pages/user/PaymentResultPage";

// ── Admin ─────────────────────────────────────────────────────────────────────
import DashboardPage           from "./pages/admin/DashboardPage";
import UsersPage               from "./pages/admin/UsersPage";
import LocationsPage           from "./pages/admin/LocationsPage";
import ToursPage               from "./pages/admin/ToursPage";
import AdvertisementsPage      from "./pages/admin/AdvertisementsPage";
import ApprovedTeamPage        from "./pages/admin/ApprovedTeamPage";
import ExploreSectionsPage     from "./pages/admin/ExploreSectionsPage";
import TagsPage                from "./pages/admin/TagsPage";
import AdminClaimsPage         from "./pages/admin/AdminClaimsPage";
import AdminBookingsPage       from "./pages/admin/AdminBookingsPage";
import AdminTourProductsPage   from "./pages/admin/AdminTourProductsPage";
import SystemConfigPage        from "./pages/admin/SystemConfigPage";    // MỚI
import AdminPaymentsPage       from "./pages/admin/AdminPaymentsPage";   // MỚI
import AdminPayoutsPage        from "./pages/admin/AdminPayoutsPage";    // MỚI
import AdminDiscountsPage    from "./pages/admin/AdminDiscountsPage";    // MỚI

// ── Company ───────────────────────────────────────────────────────────────────
import CompanyDashboardPage    from "./pages/company/CompanyDashboardPage";
import CompanyLocationsPage    from "./pages/company/CompanyLocationsPage";
import CompanyAdsPage          from "./pages/company/CompanyAdsPage";
import CompanyClaimsPage       from "./pages/company/CompanyClaimsPage";
import CompanyProfilePage      from "./pages/company/CompanyProfilePage";
import CompanyPayoutsPage      from "./pages/company/CompanyPayoutsPage";
import CompanyBookingLocPage   from "./pages/company/CompanyBookingLocPage";
import CompanyOrderListPage    from "./pages/company/CompanyOrderListPage";
import CompanyOrderDetailPage  from "./pages/company/CompanyOrderDetailPage";
import ServiceUnitPage         from "./pages/company/ServiceUnitPage";
import AmenityTemplatePage     from "./pages/company/AmenityTemplatePage";
import ChargeTemplatePage      from "./pages/company/ChargeTemplatePage";
import CompanyStaffPage        from "./pages/company/CompanyStaffPage";
import CompanyTourProductsPage      from "./pages/company/CompanyTourProductsPage";      // MỚI
import CompanyTourBookingDetailPage from "./pages/company/CompanyTourBookingDetailPage"; // MỚI
import CompanyDiscountsPage         from "./pages/company/CompanyDiscountsPage";          // MỚI

// ── Staff Portal ──────────────────────────────────────────────────────────────
import StaffBookingsPage    from "./pages/staff/StaffBookingsPage";
import StaffOrderDetailPage from "./pages/staff/StaffOrderDetailPage";
import StaffUnitsPage       from "./pages/staff/StaffUnitsPage";
import WalkInBookingPage    from "./pages/staff/WalkInBookingPage";

// ── Approved Team ─────────────────────────────────────────────────────────────
import ATDashboardPage from "./pages/approved/ATDashboardPage";
import ATLocationsPage from "./pages/approved/ATLocationsPage";
import ATReviewPage    from "./pages/approved/ATReviewPage";
import ATVotePage      from "./pages/approved/ATVotePage";
import ATClaimsPage    from "./pages/approved/ATClaimsPage";
import ATProfilePage   from "./pages/approved/ATProfilePage";

// ── Route guards ──────────────────────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"/>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (user.role === "admin")         return <Navigate to="/admin"    replace />;
    if (user.role === "company")       return <Navigate to="/company"  replace />;
    if (user.role === "approved")      return <Navigate to="/approved" replace />;
    if (user.role === "company_staff") return <Navigate to="/staff"    replace />;
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Auth ─────────────────────────────────────────────────────────── */}
        <Route path="/login"            element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register"         element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
        <Route path="/reset-password"   element={<ResetPasswordPage />} />

        {/* ── Admin ────────────────────────────────────────────────────────── */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout /></ProtectedRoute>}>
          <Route index                   element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"        element={<DashboardPage />} />
          <Route path="users"            element={<UsersPage />} />
          <Route path="locations"        element={<LocationsPage />} />
          <Route path="tours"            element={<ToursPage />} />
          <Route path="advertisements"   element={<AdvertisementsPage />} />
          <Route path="approved-team"    element={<ApprovedTeamPage />} />
          <Route path="explore-sections" element={<ExploreSectionsPage />} />
          <Route path="tags"             element={<TagsPage />} />
          <Route path="claims"           element={<AdminClaimsPage />} />
          <Route path="bookings"         element={<AdminBookingsPage />} />
          <Route path="config"           element={<SystemConfigPage />} />
          <Route path="payments"         element={<AdminPaymentsPage />} />
          <Route path="payouts"          element={<AdminPayoutsPage />} />
          <Route path="tour-products"         element={<AdminTourProductsPage />} />
          <Route path="discounts"             element={<AdminDiscountsPage />} />
        </Route>

        {/* ── Company ──────────────────────────────────────────────────────── */}
        <Route path="/company" element={<ProtectedRoute allowedRoles={["company"]}><CompanyLayout /></ProtectedRoute>}>
          <Route index                           element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"                element={<CompanyDashboardPage />} />
          <Route path="profile"                  element={<CompanyProfilePage />} />
          <Route path="locations"                element={<CompanyLocationsPage />} />
          <Route path="locations/:id/units"      element={<ServiceUnitPage />} />
          <Route path="locations/:id/amenities"  element={<AmenityTemplatePage />} />
          <Route path="locations/:id/charges"    element={<ChargeTemplatePage />} />
          <Route path="bookings"                 element={<CompanyBookingLocPage />} />
          <Route path="bookings/:locationId"     element={<CompanyOrderListPage />} />
          <Route path="bookings/:locationId/:orderId" element={<CompanyOrderDetailPage />} />
          <Route path="tour-products"            element={<CompanyTourProductsPage />} />
          <Route path="tour-bookings/:orderId"   element={<CompanyTourBookingDetailPage />} />
          <Route path="advertisements"           element={<CompanyAdsPage />} />
          <Route path="claims"                   element={<CompanyClaimsPage />} />
          <Route path="staff"                    element={<CompanyStaffPage />} />
          <Route path="payouts"                  element={<CompanyPayoutsPage />} />
          <Route path="discounts"               element={<CompanyDiscountsPage />} />
        </Route>

        {/* ── Staff Portal ─────────────────────────────────────────────────── */}
        <Route path="/staff" element={<ProtectedRoute allowedRoles={["company_staff"]}><StaffLayout /></ProtectedRoute>}>
          <Route index               element={<Navigate to="bookings" replace />} />
          <Route path="bookings"     element={<StaffBookingsPage />} />
          <Route path="bookings/:id" element={<StaffOrderDetailPage />} />
          <Route path="units"        element={<StaffUnitsPage />} />
          <Route path="walk-in"      element={<WalkInBookingPage />} />
        </Route>

        {/* ── Approved Team ─────────────────────────────────────────────────── */}
        <Route path="/approved" element={<ProtectedRoute allowedRoles={["approved"]}><ATLayout /></ProtectedRoute>}>
          <Route index            element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ATDashboardPage />} />
          <Route path="locations" element={<ATLocationsPage />} />
          <Route path="review"    element={<ATReviewPage />} />
          <Route path="vote"      element={<ATVotePage />} />
          <Route path="claims"    element={<ATClaimsPage />} />
          <Route path="profile"   element={<ATProfilePage />} />
        </Route>

        {/* ── User / Public ─────────────────────────────────────────────────── */}
        <Route path="/" element={<UserLayout />}>
          <Route index                           element={<ExplorePage />} />
          <Route path="explore"                  element={<ExplorePage />} />
          <Route path="explore/section/:key"     element={<SectionPage />} />
          <Route path="locations/add"            element={<ProtectedRoute><LocationFormPage /></ProtectedRoute>} />
          <Route path="locations/edit/:id"       element={<ProtectedRoute><LocationFormPage /></ProtectedRoute>} />
          <Route path="locations/:id"            element={<LocationDetailPage />} />
          <Route path="tours"                    element={<TourSuggestionsPage />} />
          <Route path="tours/:id"                element={<TourDetailPage />} />
          <Route path="tours/products"           element={<TourProductListPage />} />
          <Route path="tours/products/:id"       element={<TourProductDetailPage />} />
          <Route path="trips"                    element={<ProtectedRoute><MyTripsPage /></ProtectedRoute>} />
          <Route path="trips/:id"                element={<ProtectedRoute><TripPlannerPage /></ProtectedRoute>} />
          <Route path="search/:category"         element={<SearchResultsPage />} />
          <Route path="profile"                  element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="favorites"                element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="profile/bookings"         element={<ProtectedRoute><UserBookingsPage /></ProtectedRoute>} />
          <Route path="profile/bookings/:id"     element={<ProtectedRoute><UserBookingDetailPage /></ProtectedRoute>} />
          <Route path="booking/payment/:orderId" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="payment/result"            element={<PaymentResultPage />} />
        </Route>

        {/* ── 404 ──────────────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
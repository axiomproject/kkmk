import { createBrowserRouter, Navigate } from 'react-router-dom';
import GuestLayout from '../layouts/GuestLayout';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Help from '../pages/Help';
import Life from '../pages/Life';
import Community from '../pages/sub/Community';
import Contact from '../pages/sub/Contact';
import Events from '../pages/sub/Events';
import Graduates from '../pages/sub/Graduates';
import Partner from '../pages/sub/Partner';
import Story from '../pages/sub/Story';
import Team from '../pages/sub/Team';
import Profile from '../pages/volunteer/VolunteerProfile';
import VolunteerSettings from '../pages/volunteer/VolunteerSettings';
import EmailVerification from '../pages/EmailVerification';
import ForgotPassword from '../pages/sub/ForgotPassword';
import { PATHS } from './paths';
import ResetPassword from '../pages/sub/ResetPassword';
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminUsers from '../pages/admin/Users';
import AdminScholars from '../pages/admin/Scholars';
import AdminSponsor from '../pages/admin/Sponsor';
import AdminEvents from '../pages/admin/Events';
import AdminStaff from '../pages/admin/Staff';
import AdminSettings from '../pages/admin/Settings';
import Analytics from '../pages/admin/Analytics';
import Forum from '../components/forum/Forum'; // Import the Forum component
import AdminInventory from '../pages/admin/Inventory'; // Add this import at the top
import Bank from '../pages/admin/Bank'; // Add this import at the top with other imports
import EventDetails from '../pages/sub/EventDetails';
import Contacts from '../pages/admin/Contacts';
import { useAuth } from '../hooks/useAuth'; // Add this import
import Map from '../pages/InteractiveMap';
import StudentProfile from '../pages/StudentProfile'; // Add this import
import StudentDetails from '../pages/StudentDetails'; // Add import for new component
import MyScholar from '../pages/MyScholar';  // Add this import
import ScholarProfile from '../pages/admin/scholars/ScholarProfile'; // Add this import
import ScholarDonations from '../pages/admin/ScholarDonations';
import ScholarReports from '../pages/admin/ScholarReports';
import AdminMap from '../pages/admin/Maps'; // Add this import
import CMS from '../pages/admin/ContentEditor'; // Add this import
import Scholarslocation from '../pages/admin/scholars/Scholarslocation'; // Add this import
import FORUMPOLL from '../components/analytics/ForumAnalytics';
import EVENTFEEDBACK from '../components/EventFeedbackAnalytics';

interface RoleRouteProps {
  element: React.ReactNode;
  allowedRoles: string[];
}

const RoleRoute: React.FC<RoleRouteProps> = ({ element, allowedRoles }) => {
  const { user } = useAuth();
  return allowedRoles.includes(user?.role || '') ? element : <Navigate to="/login" />;
};

const router = createBrowserRouter([
  {
    element: <GuestLayout />,
    children: [
      {
        path: PATHS.HOME,
        element: <Home />
      },
      {
        path: PATHS.HELP,
        element: <Help />
      },
      {
        path: PATHS.LIFE,
        element: <Life />
      },
      {
        path: PATHS.COMMUNITY,
        element: <Community />
      },
      {
        path: PATHS.CONTACT,
        element: <Contact />
      },
      {
        path: PATHS.EVENTS,
        element: <Events />
      },
      {
        path: PATHS.EVENT_DETAILS,
        element: <EventDetails />
      },
      {
        path: PATHS.GRADUATES,
        element: <Graduates />
      },
      {
        path: PATHS.PARTNER,
        element: <Partner />
      },
      {
        path: PATHS.STORY,
        element: <Story />
      },
      {
        path: PATHS.TEAM,
        element: <Team />
      },
      {
        path: PATHS.VOLUNTEER_PROFILE,
        element: <Profile />
      },
      {
        path: PATHS.VOLUNTEER_SETTINGS,
        element: <VolunteerSettings />
      },
      {
        path: PATHS.FORUM, // Add the Forum route
        element: <Forum />
      },
      {
        path: PATHS.MAP, // Add the Forum route
        element: <Map />
      },
      {
        path: PATHS.STUDENTPROFILE, // Add the Forum route
        element: <StudentProfile />
      },
      {
        path: PATHS.STUDENT_DETAILS, // Add the StudentDetails route
        element: <StudentDetails />
      },
      {
        path: PATHS.MY_SCHOLAR,
        element: <MyScholar />
      },
    ]
  },
  {
    path: PATHS.LOGIN,
    element: <Login />
  },
  {
    path: PATHS.FORGOT_PASSWORD,
    element: <ForgotPassword />
  },
  {
    path: PATHS.REGISTER,
    element: <Register />
  },
  {
    path: '/verify-email/:token',
    element: <EmailVerification />
  },
  {
    path: '/reset-password/:token',
    element: <ResetPassword />
  },
  {
    element: <AdminLayout />,
    children: [
      // Admin routes
      {
        path: PATHS.ADMIN.DASHBOARD,
        element: <RoleRoute element={<AdminDashboard />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: PATHS.ADMIN.MAP,
        element: <RoleRoute element={<AdminMap />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: '/users',
        element: <RoleRoute element={<AdminUsers />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: '/Scholars',
        element: <RoleRoute element={<AdminScholars />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: '/Sponsor',
        element: <RoleRoute element={<AdminSponsor />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: '/Event',
        element: <RoleRoute element={<AdminEvents />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: '/staff',
        element: <RoleRoute element={<AdminStaff />} allowedRoles={['admin']} />
      },
      {
        path: '/admin-settings',
        element: <RoleRoute element={<AdminSettings />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: '/analytics',
        element: <RoleRoute element={<Analytics />} allowedRoles={['admin']} />
      },
      {
        path: '/inventory',
        element: <RoleRoute element={<AdminInventory />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: '/bank',
        element: <RoleRoute element={<Bank />} allowedRoles={['admin']} />
      },
      {
        path: '/Contacts',
        element: <RoleRoute element={<Contacts/>} allowedRoles={['admin', 'staff']} />
      },
      {
        path: PATHS.ADMIN.EVENTFEEDBACK,
        element: <RoleRoute element={<EVENTFEEDBACK />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: PATHS.ADMIN.FORUMPOLL,
        element: <RoleRoute element={<FORUMPOLL />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: PATHS.ADMIN.CMS,
        element: <RoleRoute element={<CMS />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: PATHS.ADMIN.SCHOLARS.MANAGEMENT,
        element: <RoleRoute element={<AdminScholars />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: PATHS.ADMIN.SCHOLARS.PROFILE,
        element: <RoleRoute element={<ScholarProfile />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: PATHS.ADMIN.SCHOLARS.DONATIONS,
        element: <RoleRoute element={<ScholarDonations />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: PATHS.ADMIN.SCHOLARS.LOCATION,
        element: <RoleRoute element={<Scholarslocation />} allowedRoles={['admin', 'staff']} />
      },
      {
        path: PATHS.ADMIN.SCHOLARS.REPORTS,
        element: <RoleRoute element={<ScholarReports />} allowedRoles={['admin', 'staff']} />
      },
      // Staff routes
      {
        path: PATHS.STAFF.DASHBOARD,
        element: <RoleRoute element={<AdminDashboard />} allowedRoles={['staff']} />
      },
      {
        path: PATHS.STAFF.PROFILE,
        element: <RoleRoute element={<Profile />} allowedRoles={['staff']} />
      },
      {
        path: PATHS.STAFF.VOLUNTEERS,
        element: <RoleRoute element={<AdminUsers />} allowedRoles={['staff']} />
      },
      {
        path: PATHS.STAFF.EVENTS,
        element: <RoleRoute element={<AdminEvents />} allowedRoles={['staff']} />
      }
    ]
  }
]);

export { router };

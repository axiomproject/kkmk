export const PATHS = {
  HOME: '/',
  LOGIN: '/Login',
  REGISTER: '/Register',
  HELP: '/Help',
  STORY: '/Story',
  PARTNER: '/Partner',
  TEAM: '/Team',
  EVENTS: '/Events',
  EVENT_DETAILS: '/event/:eventId',
  LIFE: '/Life',
  GRADUATES: '/Graduates',
  COMMUNITY: '/Community',
  CONTACT: '/Contact',
  VOLUNTEER_PROFILE: '/Profile',
  VOLUNTEER_SETTINGS: '/Settings',
  VERIFY_EMAIL: '/verify-email/:token',
  FORGOT_PASSWORD: '/ForgotPassword',
  RESET_PASSWORD: '/reset-password/:token',
  FORUM: '/Forum',
  MAP: '/Map',
  STUDENTPROFILE: '/StudentProfile',  // Ensure this matches how we use it
  STUDENT_DETAILS: '/StudentProfile/:studentId',  // Add this line
  MY_SCHOLAR: '/MyScholar',  // Add this new path
  STAFF: {
    DASHBOARD: '/staff/dashboard',
    PROFILE: '/staff/profile',
    VOLUNTEERS: '/staff/volunteers',
    EVENTS: '/staff/events'
  },
  ADMIN: {
    DASHBOARD: '/Dashboard',
    MAP: '/Maps',
    USERS: '/Users',
    EVENTS: '/Event',
    STAFF: '/Staff',
    ANALYTICS: '/Analytics',
    SETTINGS: '/Admin-Settings',
    INVENTORY: '/Inventory',
    BANK: '/Bank',
    CONTACTS: '/Contacts',
    SPONSOR: '/Sponsor',
    FORUMPOLL: '/ForumPoll',
    EVENTFEEDBACK: '/EventFeedback',
    CMS: '/Content',
    SCHOLARS: {
      MANAGEMENT: '/Scholars/Management',
      PROFILE: '/Scholars/Profile',
      DONATIONS: '/ScholarDonations',
      REPORTS: '/ScholarReports',
      LOCATION:'/ScholarLocation',
    }
  }
} as const;

export default PATHS;

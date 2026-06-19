import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';
import AnalyticsDashboard from './AnalyticsDashboard';
import FinanceTab from './FinanceTab';
import DeveloperTab from './DeveloperTab';
import ICalManagerTab from './iCalManagerTab';
import PublicBookingTab from './PublicBookingTab';
import WidgetsTab from './WidgetsTab';
import BusinessOverview from '../admin/BusinessOverview';
import SettingsTab from '../admin/SettingsTab';
import ServicesTab from '../admin/ServicesTab';
import AppointmentsTab from '../admin/AppointmentsTab';
import UsersTab from '../admin/UsersTab';
import StaffTab from '../admin/StaffTab';
import CouponsTab from '../admin/CouponsTab';
import TemplatesTab from '../admin/TemplatesTab';

export default function AdminDashboard() {
  useAuth();
  const { settings } = useBusiness();
  const { tab } = useParams();

  const primaryColor = settings?.primary_color || '#e11d48';
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: primaryColor, boxShadow: '0 2px 8px ' + primaryColor + '40' }}>
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: primaryColor + '12', color: primaryColor }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
            Administration
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text tracking-tight">Business Overview</h1>
        <p className="text-text-secondary mt-2 text-sm">Monitor today's activity and track business performance — from services to revenue</p>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        {(!tab || tab === 'story') && <BusinessOverview />}
        {tab === 'staff' && <StaffTab />}
        {tab === 'services' && <ServicesTab />}
        {tab === 'appointments' && <AppointmentsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'finance' && <FinanceTab />}
        {tab === 'developer' && <DeveloperTab />}
        {tab === 'ical' && <ICalManagerTab />}
        {tab === 'public' && <PublicBookingTab />}
        {tab === 'widget' && <WidgetsTab />}
        {tab === 'coupons' && <CouponsTab />}
        {tab === 'analytics' && <AnalyticsDashboard />}
        {tab === 'templates' && <TemplatesTab />}
      </div>
    </div>
  );
}

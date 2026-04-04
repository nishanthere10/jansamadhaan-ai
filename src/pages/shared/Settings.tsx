import { motion } from 'framer-motion';
import { User, Bell, Shield, Palette } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  const sections = [
    {
      title: 'Profile',
      icon: User,
      description: 'Manage your account details and preferences',
      items: [
        { label: 'Name', value: user?.full_name || user?.email || '—' },
        { label: 'Email', value: user?.email || '—' },
        { label: 'Role', value: user?.role || '—' },
      ],
    },
    {
      title: 'Notifications',
      icon: Bell,
      description: 'Configure how you receive alerts and updates',
      items: [
        { label: 'Email Notifications', value: 'Enabled' },
        { label: 'Push Notifications', value: 'Coming Soon' },
        { label: 'SMS Alerts', value: 'Coming Soon' },
      ],
    },
    {
      title: 'Security',
      icon: Shield,
      description: 'Manage your account security settings',
      items: [
        { label: 'Two-Factor Auth', value: 'Not Configured' },
        { label: 'Last Login', value: new Date().toLocaleDateString() },
      ],
    },
    {
      title: 'Appearance',
      icon: Palette,
      description: 'Customize the look and feel',
      items: [
        { label: 'Theme', value: 'System Default' },
        { label: 'Language', value: 'English' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="cr-page-title">Settings</h1>
        <p className="cr-page-subtitle">Manage your account and application preferences</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="cr-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--cr-blue-light)', color: 'var(--cr-blue)' }}
              >
                <section.icon size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--cr-text)' }}>
                  {section.title}
                </h3>
                <p className="text-xs text-[var(--cr-text-muted)]">{section.description}</p>
              </div>
            </div>
            <div className="space-y-3">
              {section.items.map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-sm text-[var(--cr-text-muted)]">{item.label}</span>
                  <span className="text-sm font-medium capitalize" style={{ color: 'var(--cr-text)' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

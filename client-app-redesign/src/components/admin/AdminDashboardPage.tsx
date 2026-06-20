import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, Users, UserCheck, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { api, AdminUser } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { extractErrorMessage } from '../../utils/errorUtils';

export default function AdminDashboardPage() {
  const { t } = useSettings();
  const { showToast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // holds userId being deleted

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAdminUsers();
      // Sort users by createdAt descending if available, otherwise by username
      const sorted = [...data].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.username.localeCompare(b.username);
      });
      setUsers(sorted);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = useCallback(async (userId: string, username: string) => {
    const confirmMessage = `${username} ${t('userDeleteConfirm')}`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setActionLoading(userId);
      const res = await api.deleteUser(userId);
      showToast(res.message || t('deleteSuccess'));
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  }, [t, showToast]);

  // Statistics calculations
  const stats = useMemo(() => {
    const result = {
      total: users.length,
      sellers: 0,
      mfrs: 0,
      admins: 0
    };
    users.forEach(u => {
      if (u.role === 'seller') result.sellers++;
      else if (u.role === 'mfr') result.mfrs++;
      else if (u.role === 'admin') result.admins++;
    });
    return result;
  }, [users]);

  if (loading) {
    return (
      <div className="profile-loading-container" style={{ minHeight: '60vh' }}>
        <Loader2 className="spinner" size={40} />
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Stats Summary Section */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-title">{t('totalUsers')}</div>
          <div className="admin-stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{stats.total}</span>
            <Users size={28} className="text-muted" style={{ opacity: 0.5 }} />
          </div>
        </div>

        <div className="admin-stat-card seller-only">
          <div className="admin-stat-title">{t('roleSellerLabel')}</div>
          <div className="admin-stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{stats.sellers}</span>
            <UserCheck size={28} style={{ opacity: 0.5 }} />
          </div>
        </div>

        <div className="admin-stat-card mfr-only">
          <div className="admin-stat-title">{t('roleMfrLabel')}</div>
          <div className="admin-stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{stats.mfrs}</span>
            <UserCheck size={28} style={{ opacity: 0.5 }} />
          </div>
        </div>

        <div className="admin-stat-card admin-only">
          <div className="admin-stat-title">{t('roleAdminLabel')}</div>
          <div className="admin-stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{stats.admins}</span>
            <ShieldCheck size={28} style={{ opacity: 0.5 }} />
          </div>
        </div>
      </div>

      {error && (
        <div className="feedback-error-alert" style={{ marginBottom: '20px' }}>
          <span>{error}</span>
          <button type="button" className="btn-secondary" onClick={fetchUsers} style={{ padding: '4px 8px', fontSize: '0.8rem', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={12} />
            <span>Yeniden Dene</span>
          </button>
        </div>
      )}

      {/* Users Table Card */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>{t('tabUsers')}</h2>
          <button type="button" className="btn-secondary btn-icon" onClick={fetchUsers} title="Refresh" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          </button>
        </div>

        <div className="admin-table-wrapper">
          {users.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
              {t('noUsersFound')}
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('columnUsername')}</th>
                  <th>{t('columnFullName')}</th>
                  <th>{t('columnEmail')}</th>
                  <th>{t('columnPhone')}</th>
                  <th>{t('columnRole')}</th>
                  <th>{t('columnCreatedAt')}</th>
                  <th>{t('columnActions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td>{u.firstName} {u.lastName}</td>
                    <td>{u.email}</td>
                    <td>{u.phoneNumber || '-'}</td>
                    <td>
                      <span className={`admin-role-badge ${u.role}`}>
                        {u.role === 'admin' ? t('roleAdminLabel') : (u.role === 'mfr' ? t('roleMfrLabel') : t('roleSellerLabel'))}
                      </span>
                    </td>
                    <td>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-danger btn-icon"
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        disabled={actionLoading !== null}
                        title={t('btnDeleteUser')}
                        style={{ padding: '6px' }}
                      >
                        {actionLoading === u.id ? (
                          <Loader2 size={14} className="spinner" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}

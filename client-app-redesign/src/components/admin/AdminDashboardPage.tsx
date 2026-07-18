import { useMemo } from 'react';
import { Trash2, Users, UserCheck, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import styles from './AdminDashboardPage.module.css';

export default function AdminDashboardPage() {
  const { t } = useSettings();
  const { users, loading, error, actionLoading, fetchUsers, deleteUser } = useAdminUsers();

  // Statistics calculations
  const stats = useMemo(() => {
    const result = {
      total: users.length,
      sellers: 0,
      mfrs: 0,
      admins: 0,
    };
    users.forEach((u) => {
      if (u.role === 'seller') result.sellers++;
      else if (u.role === 'mfr') result.mfrs++;
      else if (u.role === 'admin') result.admins++;
    });
    return result;
  }, [users]);

  if (loading) {
    return (
      <div className="profile-loading-container profile-loading-container--full">
        <Loader2 className="spinner" size={40} />
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Stats Summary Section */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-title">{t('totalUsers')}</div>
          <div className={styles.statRow}>
            <span>{stats.total}</span>
            <Users size={28} className="text-muted admin-stat-total-icon" />
          </div>
        </div>

        <div className="admin-stat-card seller-only">
          <div className="admin-stat-title">{t('roleSellerLabel')}</div>
          <div className={styles.statRow}>
            <span>{stats.sellers}</span>
            <UserCheck size={28} className={styles.statIcon} />
          </div>
        </div>

        <div className="admin-stat-card mfr-only">
          <div className="admin-stat-title">{t('roleMfrLabel')}</div>
          <div className={styles.statRow}>
            <span>{stats.mfrs}</span>
            <UserCheck size={28} className={styles.statIcon} />
          </div>
        </div>

        <div className="admin-stat-card admin-only">
          <div className="admin-stat-title">{t('roleAdminLabel')}</div>
          <div className={styles.statRow}>
            <span>{stats.admins}</span>
            <ShieldCheck size={28} className={styles.statIcon} />
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.alertBox}>
          <span>{error}</span>
          <button
            type="button"
            className={`btn-secondary ${styles.refreshButton}`}
            onClick={() => fetchUsers()}
          >
            <RefreshCw size={12} />
            <span>Yeniden Dene</span>
          </button>
        </div>
      )}

      {/* Users Table Card */}
      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>{t('tabUsers')}</h2>
          <button
            type="button"
            className="btn-secondary btn-icon"
            onClick={() => fetchUsers()}
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          </button>
        </div>

        <div className="admin-table-wrapper">
          {users.length === 0 ? (
            <div className={styles.emptyState}>{t('noUsersFound')}</div>
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
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className={styles.boldText}>{u.username}</td>
                    <td>
                      {u.firstName} {u.lastName}
                    </td>
                    <td>{u.email}</td>
                    <td>{u.phoneNumber || '-'}</td>
                    <td>
                      <span className={`admin-role-badge ${u.role}`}>
                        {u.role === 'admin'
                          ? t('roleAdminLabel')
                          : u.role === 'mfr'
                            ? t('roleMfrLabel')
                            : t('roleSellerLabel')}
                      </span>
                    </td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-danger btn-icon"
                        onClick={() => deleteUser(u.id, u.username)}
                        disabled={actionLoading !== null}
                        title={t('btnDeleteUser')}
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

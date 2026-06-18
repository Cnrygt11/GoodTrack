import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { api, UserProfile } from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';

export default function useUserProfileDetail(username: string | undefined) {
  const { user: currentUser } = useAuth();
  const { language, t } = useSettings();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!username) return;

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.getProfileByUsername(username);
        setProfile(data);
      } catch (err: unknown) {
        console.error(err);
        setError(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username, language]);

  return {
    profile,
    loading,
    error,
    currentUser,
    t,
  };
}

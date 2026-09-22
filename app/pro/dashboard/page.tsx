'use client';
import { useEffect } from 'react';
import { awsApi, cognitoToken } from '../../aws-client';
import { RedirectScreen } from '../../redirect-screen';
export default function ProDashboard() {
  useEffect(() => {
    void (async () => {
      if (!(await cognitoToken())) {
        window.location.replace('/pro/sign-in');
        return;
      }
      const response = await awsApi('/pro/application'),
        data = await response.json();
      window.location.replace(
        response.ok && data.application?.status === 'approved'
          ? '/seller'
          : '/pro/apply',
      );
    })();
  }, []);
  return <RedirectScreen message="Checking your CrownConnect Pro approval…" />;
}

import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/** Online/offline boolean with live updates. */
export function useIsOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      setOnline(!!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => sub();
  }, []);
  return online;
}

import { useEffect, useState } from 'react';

export type ConnectivityStatus = 'ONLINE' | 'OFFLINE';
export type SyncState = 'IDLE' | 'SYNCING' | 'COMPLETED' | 'FAILED' | 'CONFLICT';

export interface DemoSettings {
  forceOffline: boolean;
  simulateSyncFailure: boolean;
  simulateConflict: boolean;
}

class ConnectivityManager {
  private isBrowserOnline: boolean = typeof window !== 'undefined' ? navigator.onLine : true;
  private demoSettings: DemoSettings = {
    forceOffline: false,
    simulateSyncFailure: false,
    simulateConflict: false,
  };
  private syncState: SyncState = 'IDLE';
  private syncMessage: string = '';
  private pendingCount: number = 0;
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isBrowserOnline = true;
        this.notify();
      });
      window.addEventListener('offline', () => {
        this.isBrowserOnline = false;
        this.notify();
      });
    }
  }

  public getStatus(): ConnectivityStatus {
    if (this.demoSettings.forceOffline) {
      return 'OFFLINE';
    }
    return this.isBrowserOnline ? 'ONLINE' : 'OFFLINE';
  }

  public isOnline(): boolean {
    return this.getStatus() === 'ONLINE';
  }

  public isOffline(): boolean {
    return this.getStatus() === 'OFFLINE';
  }

  public getDemoSettings(): DemoSettings {
    return { ...this.demoSettings };
  }

  public setDemoOffline(forceOffline: boolean) {
    this.demoSettings.forceOffline = forceOffline;
    this.notify();
  }

  public setSimulateSyncFailure(simulateFailure: boolean) {
    this.demoSettings.simulateSyncFailure = simulateFailure;
    this.notify();
  }

  public setSimulateConflict(simulateConflict: boolean) {
    this.demoSettings.simulateConflict = simulateConflict;
    this.notify();
  }

  public setSyncState(state: SyncState, message: string = '', pendingCount: number = 0) {
    this.syncState = state;
    this.syncMessage = message;
    this.pendingCount = pendingCount;
    this.notify();
  }

  public getSyncState() {
    return {
      state: this.syncState,
      message: this.syncMessage,
      pendingCount: this.pendingCount,
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}

export const connectivityManager = new ConnectivityManager();

export function useConnectivity() {
  const [status, setStatus] = useState<ConnectivityStatus>(connectivityManager.getStatus());
  const [demoSettings, setDemoSettings] = useState<DemoSettings>(connectivityManager.getDemoSettings());
  const [syncInfo, setSyncInfo] = useState(connectivityManager.getSyncState());

  useEffect(() => {
    const unsubscribe = connectivityManager.subscribe(() => {
      setStatus(connectivityManager.getStatus());
      setDemoSettings(connectivityManager.getDemoSettings());
      setSyncInfo(connectivityManager.getSyncState());
    });
    return unsubscribe;
  }, []);

  return {
    status,
    isOnline: status === 'ONLINE',
    isOffline: status === 'OFFLINE',
    demoSettings,
    syncInfo,
    setDemoOffline: (val: boolean) => connectivityManager.setDemoOffline(val),
    setSimulateSyncFailure: (val: boolean) => connectivityManager.setSimulateSyncFailure(val),
    setSimulateConflict: (val: boolean) => connectivityManager.setSimulateConflict(val),
  };
}

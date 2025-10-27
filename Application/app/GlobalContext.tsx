import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { EventSubscription, Platform } from "react-native";
import { request, check, PERMISSIONS, RESULTS } from "react-native-permissions";
import BleManager, { BleState } from 'react-native-ble-manager';
const GlobalContext = createContext<any>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [permissions, setPermissions] = useState(false);
    const [btState, setBtState] = useState<BleState | null>(null);
    const scanSub = React.useRef<EventSubscription | null>(null);
    const btStateSub = React.useRef<EventSubscription | null>(null);
    const [btConnected, setBtConnected] = useState(null);
    const [btInit, setBtInit] = useState(false);
    const [devices, setDevices] = useState<any[]>([]);

    const requestPermissions = useCallback(async () => {
        if (Platform.OS === "android") {
            const scan = await request(PERMISSIONS.ANDROID.BLUETOOTH_SCAN);
            const connect = await request(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
            const location = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

            if (scan === RESULTS.GRANTED && connect === RESULTS.GRANTED && location === RESULTS.GRANTED) {
                setPermissions(true);
            } else {
                setPermissions(false);
            }
        } else {
            setPermissions(true); // iOS or anything else i guess
        }

        return permissions;
    }, []);

    const checkPermissions = useCallback(async () => {
        if (Platform.OS === "android") {
            const scan = await check(PERMISSIONS.ANDROID.BLUETOOTH_SCAN);
            const connect = await check(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
            const location = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

            if (scan === RESULTS.GRANTED && connect === RESULTS.GRANTED && location === RESULTS.GRANTED) {
                setPermissions(true);
            } else {
                setPermissions(false);
            }
        } else {
            setPermissions(true); // iOS or anything else i guess
        }

        return permissions;
    }, []);

    // request user permissions on mount, update the state once requested
    useEffect(() => {
        if (permissions) return; // no request if already granted

        requestPermissions();
    }, [requestPermissions]);

    // check for permission changes every 2 seconds in case user manually changes them
    useEffect(() => {
        if (permissions) return; // no polling if already granted

        const interval = setInterval(() => {
            checkPermissions();
        }, 2000);

        return () => clearInterval(interval);
    }, [permissions, checkPermissions]);

    // init bluetooth manager once permissions are granted (only once)
    useEffect(() => {
        if (!permissions) return;

        const initBle = async () => {
            if (!btInit) {
                await BleManager.start({ showAlert: false });
                setBtInit(true); // only init once
            }

            BleManager.checkState(); // initial state check
            btStateSub.current = BleManager.onDidUpdateState((args: { state: BleState }) => {
                setBtState(args.state); // register for state updates
            });
        };

        initBle();

        return () => {
            btStateSub.current?.remove();
        };
    }, [permissions]);

    // handle bluetooth state changes and scanning
    useEffect(() => {
        if (!permissions || btConnected) return; // no need to scan if connected

        // remove any old listeners
        if (scanSub.current) {
            scanSub.current.remove();
            BleManager.stopScan();
        }

        if (btState === BleState.On) {
            // start scanning once Bluetooth is enabled
            BleManager.scan([], 0, false).then(() => {
                scanSub.current = BleManager.onDiscoverPeripheral((device: any) => {
                    if (!device?.name?.includes('BKFZ')) return; // only show BKFZ devices

                    setDevices(prev => {
                        const idx = prev.findIndex(d => d.id === device.id);

                        if (idx !== -1) {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], ...device, lastSeen: Date.now() };

                            return updated;
                        }

                        return [...prev, { ...device, lastSeen: Date.now() }];
                    });
                });
            });
        } else if (btState === BleState.Off) {
            try {
                BleManager.enableBluetooth().catch(() => {
                    return;
                });
            } catch { };
        }
    }, [btState, permissions, btConnected]);

    // remove old devices if no longer seen
    useEffect(() => {
        const interval = setInterval(() => {
            setDevices((prev: any) => {
                // keep only devices seen in the last 10 seconds
                return prev.filter((dev: any) => Date.now() - dev.lastSeen < 10000);
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <GlobalContext.Provider value={{ permissions, btState, btConnected, devices }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobal = () => {
    const ctx = useContext(GlobalContext);
    if (!ctx) throw new Error("useGlobal should be used within a GlobalProvider!!!!");

    return ctx;
};
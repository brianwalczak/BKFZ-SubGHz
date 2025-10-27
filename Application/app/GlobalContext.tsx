import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { EventSubscription, Platform } from "react-native";
import { request, check, PERMISSIONS, RESULTS } from "react-native-permissions";
import BleManager, { BleState } from 'react-native-ble-manager';
const GlobalContext = createContext<any>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [permissions, setPermissions] = useState<boolean>(false);
    const [btState, setBtState] = useState<BleState | null>(null);
    const scanSub = React.useRef<EventSubscription | null>(null);
    const btStateSub = React.useRef<EventSubscription | null>(null);
    const btConnectSub = React.useRef<EventSubscription | null>(null);
    const btDisconnectSub = React.useRef<EventSubscription | null>(null);
    const [btConnected, setBtConnected] = useState<string | null>(null);
    const [btInit, setBtInit] = useState<boolean>(false);
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

    const disconnectDevice = async () => {
        if (!permissions) return false;
        if (btConnected) {
            try {
                await BleManager.disconnect(btConnected);
            } catch { };

            setBtConnected(null);
        }

        return true;
    };

    const connectDevice = async (id: string) => {
        if (!permissions) return false;
        if (btConnected) await disconnectDevice();
        let timeoutId: ReturnType<typeof setTimeout>;

        try {
            const connect = BleManager.connect(id).then(() => {
                clearTimeout(timeoutId);
                setBtConnected(id);
                return true;
            }).catch(() => {
                clearTimeout(timeoutId);
                return false;
            });

            // 10 second timeout for connection attempts
            const timeout = new Promise<boolean>((resolve) => {
                timeoutId = setTimeout(() => {
                    try {
                        BleManager.disconnect(id);
                    } catch { };

                    resolve(false);
                }, 10000);
            });

            return await Promise.race([connect, timeout]);
        } catch {
            try {
                BleManager.disconnect(id);
            } catch { };
            
            return false;
        }
    };

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

            btConnectSub.current = BleManager.onConnectPeripheral((device: any) => {
                setBtConnected(device?.peripheral); // register for connects
            });

            btDisconnectSub.current = BleManager.onDisconnectPeripheral((device: any) => {
                if (btConnected && device?.peripheral === btConnected) {
                    setBtConnected(null); // register for disconnects
                }
            });
        };

        initBle();

        return () => {
            btStateSub.current?.remove();
            btConnectSub.current?.remove();
            btDisconnectSub.current?.remove();
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
        <GlobalContext.Provider value={{ permissions, btState, btConnected, devices, connectDevice }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobal = () => {
    const ctx = useContext(GlobalContext);
    if (!ctx) throw new Error("useGlobal should be used within a GlobalProvider!!!!");

    return ctx;
};
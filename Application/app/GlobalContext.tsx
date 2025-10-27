import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { EventSubscription, Platform } from "react-native";
import { request, check, PERMISSIONS, RESULTS } from "react-native-permissions";
import BleManager, { BleState } from 'react-native-ble-manager';
import { usePathname, useRouter } from "expo-router";
const GlobalContext = createContext<any>(undefined);

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [permissions, setPermissions] = useState<boolean>(false);
    const [btState, setBtState] = useState<BleState | null>(null);
    const [btConnected, setBtConnected] = useState<string | null>(null);
    const [btInit, setBtInit] = useState<boolean>(false);
    const [devices, setDevices] = useState<any[]>([]);

    const scanSub = React.useRef<EventSubscription | null>(null);
    const btStateSub = React.useRef<EventSubscription | null>(null);
    const btConnectSub = React.useRef<EventSubscription | null>(null);
    const btDisconnectSub = React.useRef<EventSubscription | null>(null);
    const router = useRouter();
    const pathname = usePathname();

    // request bluetooth permissions from the user
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

    // silently check bluetooth permissions from the user
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

    // disconnect from currently connected device
    const disconnectDevice = async () => {
        if (!permissions || !btInit) return false;
        if (btConnected) {
            try {
                await BleManager.disconnect(btConnected);
            } catch { };
        }

        return true;
    };

    // connect to a bluetooth device by its id
    const connectDevice = async (id: string) => {
        if (!permissions || !btInit) return false;
        if (btConnected) await disconnectDevice(); // disconnect if already connected
        let timeoutId: ReturnType<typeof setTimeout>;

        try {
            const connect = BleManager.connect(id).then(() => {
                clearTimeout(timeoutId);
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

    // navigate through pages based on bluetooth connection state
    useEffect(() => {
        if (btConnected && pathname === "/") {
            router.replace("/home"); // navigate to home page
        } else if (!btConnected && pathname !== "/") {
            router.replace("/"); // navigate to connection page
        }
    }, [btConnected]);

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

                // check if user is already connected to a device
                try {
                    const connected = await BleManager.getConnectedPeripherals([]);
                    const isDevice = connected.find((device: any) => (device?.name || device?.advertising?.localName || null)?.includes('BKFZ'));

                    if (isDevice && !btConnected) {
                        setBtConnected(isDevice.id); // set initial connected device
                    }
                } catch { };
            }

            BleManager.checkState(); // initial state check

            btStateSub.current = BleManager.onDidUpdateState((args: { state: BleState }) => {
                setBtState(args.state); // register for state updates
            });

            btConnectSub.current = BleManager.onConnectPeripheral(async (device: any) => {
                if (!btConnected) {
                    // try to find the device name for validation
                    let deviceName = null;

                    const found = devices.find(d => d.id === device?.peripheral);
                    if (found) {
                        deviceName = found.name;
                    } else {
                        try {
                            const details = await BleManager.retrieveServices(device?.peripheral);
                            deviceName = (details?.name || details?.advertising?.localName || null);
                        } catch { };
                    }

                    if (deviceName && deviceName.includes('BKFZ')) {
                        setBtConnected(device?.peripheral); // register for connects
                    }
                }
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
        if (!permissions || btConnected || !btInit) return; // no need to scan if connected

        // remove any old listeners
        if (scanSub.current) {
            scanSub.current.remove();
            BleManager.stopScan();
        }

        if (btState === BleState.On) {
            // start scanning once Bluetooth is enabled
            BleManager.scan([], 0, false).then(() => {
                scanSub.current = BleManager.onDiscoverPeripheral((device: any) => {
                    const data = { name: (device?.name || device?.advertising?.localName || null), id: device?.id };
                    if (!data.name?.includes('BKFZ')) return; // only show BKFZ devices

                    setDevices(prev => {
                        const idx = prev.findIndex(d => d.id === data.id);

                        if (idx !== -1) {
                            const updated = [...prev];
                            updated[idx] = { ...updated[idx], ...data, lastSeen: Date.now() };

                            return updated;
                        }

                        return [...prev, { ...data, lastSeen: Date.now() }];
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
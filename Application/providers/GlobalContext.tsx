import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { EventSubscription, Platform } from "react-native";
import { request, check, PERMISSIONS, RESULTS } from "react-native-permissions";
import BleManager, { BleState } from 'react-native-ble-manager';
import { usePathname, useRouter } from "expo-router";
import { buildPacket, parsePacket } from './packets.js';
const GlobalContext = createContext<any>(undefined);
const nameFilter = "BKFZ";

const SERVICE_UUID = "b1513422-2e10-4528-b293-39409019252f";
const TX_UUID = "cffa88bb-f8ac-423b-9031-0266d4f3aec1";
const RX_UUID = "d4f3aec1-423b-9031-0266-cffa88bb1234";

let dataLength: number = 0;
let dataBuffer: Uint8Array = new Uint8Array(0);
let CHUNK_SIZE = 20;

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [permissions, setPermissions] = useState<boolean>(false);
    const [btState, setBtState] = useState<BleState | null>(null);
    const [btConnected, setBtConnected] = useState<string | null>(null);
    const [btInit, setBtInit] = useState<boolean>(false);
    const [devices, setDevices] = useState<any[]>([]);
    const [message, setMessage] = useState<[string, string] | null>(null);

    const startScanSub = React.useRef<EventSubscription | null>(null);
    const stopScanSub = React.useRef<EventSubscription | null>(null);
    const btStateSub = React.useRef<EventSubscription | null>(null);
    const btConnectSub = React.useRef<EventSubscription | null>(null);
    const btDisconnectSub = React.useRef<EventSubscription | null>(null);
    const btDataSub = React.useRef<EventSubscription | null>(null);
    const settingsRef = React.useRef<{}>(null);
    const router = useRouter();
    const pathname = usePathname();

    const devicesRef = React.useRef(devices);
    const btConnectedRef = React.useRef(btConnected);
    const dataCallbacks = React.useRef<{ [event: string]: ((data?: any) => void)[] }>({});

    // keep refs in sync w/ state for event handlers
    useEffect(() => { devicesRef.current = devices; }, [devices]);
    useEffect(() => { btConnectedRef.current = btConnected; }, [btConnected]);

    const registerEvent = useCallback((url: string, cb: (data: any) => void) => {
        if (!dataCallbacks.current[url]) {
            dataCallbacks.current[url] = [];
        }

        dataCallbacks.current[url].push(cb);
        return {
            remove: () => {
                dataCallbacks.current[url] = dataCallbacks.current[url].filter(callback => callback !== cb);
            }
        };
    }, []);

    // request bluetooth permissions from the user
    const requestPermissions = useCallback(async () => {
        if (Platform.OS === "android") {
            const scan = await request(PERMISSIONS.ANDROID.BLUETOOTH_SCAN);
            const connect = await request(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
            const location = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

            if (scan === RESULTS.GRANTED && connect === RESULTS.GRANTED && location === RESULTS.GRANTED) {
                setPermissions(true);
                return true;
            }
        } else if (Platform.OS === "ios") {
            const bluetooth = await request(PERMISSIONS.IOS.BLUETOOTH);

            if (bluetooth === RESULTS.GRANTED) {
                setPermissions(true);
                return true;
            }
        } else {
            setPermissions(true); // anything else i guess
            return true;
        }

        setPermissions(false);
        return false;
    }, []);

    // silently check bluetooth permissions from the user
    const checkPermissions = useCallback(async () => {
        if (Platform.OS === "android") {
            const scan = await check(PERMISSIONS.ANDROID.BLUETOOTH_SCAN);
            const connect = await check(PERMISSIONS.ANDROID.BLUETOOTH_CONNECT);
            const location = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);

            if (scan === RESULTS.GRANTED && connect === RESULTS.GRANTED && location === RESULTS.GRANTED) {
                setPermissions(true);
                return true;
            }
        } else if (Platform.OS === "ios") {
            const bluetooth = await check(PERMISSIONS.IOS.BLUETOOTH);

            if (bluetooth === RESULTS.GRANTED) {
                setPermissions(true);
                return true;
            }
        } else {
            setPermissions(true); // anything else i guess
            return true;
        }

        setPermissions(false);
        return false;
    }, []);

    // disconnect from currently connected device
    const disconnectDevice = useCallback(async () => {
        if (!permissions || !btInit) return false;
        if (btConnected) {
            try {
                await BleManager.disconnect(btConnected);
            } catch { };
        }

        return true;
    }, [permissions, btInit, btConnected]);

    // connect to a bluetooth device by its id
    const connectDevice = useCallback(async (id: string) => {
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
    }, [permissions, btInit, btConnected, disconnectDevice]);

    // send JSON data to the connected device over BLE
    const sendData = useCallback(async (payload: { page: string, data: object }) => {
        if (!btConnected) return false;

        try {
            const packet = buildPacket(payload.page, payload.data);
            console.log("Sending packet:", packet);
            console.log(Array.from(packet));

            await BleManager.write(btConnected, SERVICE_UUID, RX_UUID, Array.from(packet), CHUNK_SIZE);
            return true;
        } catch (err) {
            return false;
        }
    }, [btConnected]);

    const updateSettings = useCallback(async (newSettings: { [key: string]: any }, request: boolean = false) => {
        const oldSettings = (settingsRef.current as any)?.settings || {};
        const hasChanges = Object.keys(newSettings).some(key => newSettings[key] !== oldSettings[key]);

        if (hasChanges) {
            (settingsRef.current as any).settings = { ...oldSettings, ...newSettings };

            if (request) {
                return await sendData({
                    page: "/settings",
                    data: {
                        method: 'set',
                        payload: Object.keys(newSettings).map(key => ({ key: key, value: newSettings[key] }))
                    }
                });
            }
        }

        return true;
    }, [sendData]);

    const startScan = useCallback((clear: boolean = false) => {
        // remove old bluetooth scanner if one still exists
        if (startScanSub.current) {
            startScanSub.current.remove();
            startScanSub.current = null;
        }

        if (clear) {
            settingsRef.current = null;
            setDevices([]);
        }

        BleManager.stopScan();

        if (stopScanSub.current) {
            stopScanSub.current.remove();
            stopScanSub.current = null;
        }

        if (!permissions || btConnected || !btInit) return;

        BleManager.scan([], 15, false).then(() => {
            startScanSub.current = BleManager.onDiscoverPeripheral((device: any) => {
                const data = { name: (device?.name || device?.advertising?.localName || null), id: device?.id };
                if (!data.name?.includes(nameFilter)) return; // only show BKFZ devices

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

            stopScanSub.current = BleManager.onStopScan(() => {
                setTimeout(startScan, 2000); // restart scan after 2 seconds
            });
        });
    }, [permissions, btConnected, btInit, setDevices]);

    // request user permissions on mount, update the state once requested
    useEffect(() => {
        if (permissions) return; // no request if already granted

        requestPermissions();
    }, [requestPermissions]);

    // navigate through pages based on bluetooth connection state
    useEffect(() => {
        if (btConnected && (pathname === "/" || pathname === "/connect")) {
            router.replace("/home"); // navigate to home page
        } else if (!btConnected && (pathname !== "/" && pathname !== "/connect")) {
            router.replace("/"); // start connection flow again
        }
    }, [btConnected, pathname, router]);

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

        (async () => {
            if (!btInit) {
                await BleManager.start({ showAlert: false });
                setBtInit(true); // only init once

                // check if user is already connected to a device
                try {
                    const connected = await BleManager.getConnectedPeripherals([]);
                    const isDevice = connected.find((device: any) => (device?.name || device?.advertising?.localName || null)?.includes(nameFilter));

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
                if (!btConnectedRef.current) {
                    // try to find the device name for validation
                    let deviceName = null;

                    const found = devicesRef.current.find(d => d.id === device?.peripheral);
                    if (found) {
                        deviceName = found.name;
                    } else {
                        try {
                            const details = await BleManager.retrieveServices(device?.peripheral);
                            deviceName = (details?.name || details?.advertising?.localName || null);
                        } catch { };
                    }

                    if (deviceName && deviceName.includes(nameFilter)) {
                        setBtConnected(device?.peripheral); // register for connects
                        CHUNK_SIZE = 20; // reset chunk size on new connection
                        dataLength = 0; // reset expected data length
                        dataBuffer = new Uint8Array(0); // reset data buffer

                        try {
                            await BleManager.retrieveServices(device?.peripheral);
                            await BleManager.startNotification(device?.peripheral, SERVICE_UUID, TX_UUID);

                            if (Platform.OS === "android") {
                                BleManager.requestMTU(device?.peripheral, 145).then((mtu) => {
                                    CHUNK_SIZE = mtu - 5; // update chunk size based on negotiated MTU
                                });
                            } else if (Platform.OS === "ios") {
                                CHUNK_SIZE = 145 - 5; // iOS devices will always be minimum of 158, and capped at 145 by the BLE server
                            }

                            btDataSub.current = BleManager.onDidUpdateValueForCharacteristic(async (data: any) => {
                                if (data?.peripheral === device?.peripheral && data?.characteristic === TX_UUID) {
                                    try {
                                        const chunk = new Uint8Array(data.value);

                                        // append new bytes together
                                        const newBuffer = new Uint8Array(dataBuffer.length + chunk.length);
                                        newBuffer.set(dataBuffer);
                                        newBuffer.set(chunk, dataBuffer.length);
                                        dataBuffer = newBuffer;

                                        // if we're not expecting and have a header, save its length
                                        if (dataLength === 0 && dataBuffer.length >= 2) {
                                            const dv = new DataView(dataBuffer.buffer);
                                            dataLength = dv.getUint16(0, true);
                                        }

                                        // if we're expecting and have a full packet, process it
                                        while (dataLength !== 0 && dataBuffer.length >= dataLength) {
                                            const packet = dataBuffer.slice(0, dataLength);

                                            const parsed = parsePacket(packet.buffer);

                                            if (parsed.page && dataCallbacks.current[parsed.page]) {
                                                dataCallbacks.current[parsed.page].forEach(cb => cb(parsed.data));
                                            }

                                            if (parsed?.page === "/settings") {
                                                settingsRef.current = parsed.data || {};
                                            }

                                            // slice off the packet by expected length
                                            dataBuffer = dataBuffer.slice(dataLength);
                                            dataLength = 0;

                                            // if we have leftover with a header, save its length
                                            if (dataBuffer.length >= 2) {
                                                const dv2 = new DataView(dataBuffer.buffer);
                                                dataLength = dv2.getUint16(0, true);
                                            }
                                        }
                                    } catch { };
                                }
                            });

                            // request current settings
                            await BleManager.write(device?.peripheral, SERVICE_UUID, RX_UUID, Array.from(buildPacket("/settings", {
                                method: 'get'
                            })), CHUNK_SIZE);
                        } catch {
                            await disconnectDevice(); // disconnect if notification setup fails
                        }
                    }
                }
            });

            btDisconnectSub.current = BleManager.onDisconnectPeripheral((device: any) => {
                if (btConnectedRef.current && device?.peripheral === btConnectedRef.current) {
                    setBtConnected(null); // register for disconnects
                    btDataSub.current?.remove();
                }
            });
        })();

        return () => {
            btStateSub.current?.remove();
            btConnectSub.current?.remove();
            btDisconnectSub.current?.remove();
        };
    }, [permissions]);

    // handle bluetooth state changes and scanning
    useEffect(() => {
        if (btState === BleState.On) {
            startScan(true);
        } else if (btState === BleState.Off) {
            try {
                BleManager.enableBluetooth().catch(() => {
                    return;
                });
            } catch { };
        }

        // cleanup on unmount or dependency change :D
        return () => {
            if (startScanSub.current) {
                startScanSub.current.remove();
                startScanSub.current = null;
            }

            BleManager.stopScan();

            if (stopScanSub.current) {
                stopScanSub.current.remove();
                stopScanSub.current = null;
            }
        };
    }, [btState, permissions, btConnected, btInit]);

    // remove old devices if no longer seen
    useEffect(() => {
        const interval = setInterval(() => {
            setDevices((prev: any) => {
                // keep only devices seen in the last 25 seconds (accounting for scan restarts every 15 seconds, 10 second difference)
                return prev.filter((dev: any) => Date.now() - dev.lastSeen < 25000);
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []); // no devices needed since we're using setDevices latest state

    return (
        <GlobalContext.Provider value={{ permissions, btState, devices, settings: settingsRef.current, updateSettings, connectDevice, disconnectDevice, sendData, registerEvent, message, setMessage }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobal = () => {
    const ctx = useContext(GlobalContext);
    if (!ctx) throw new Error("useGlobal should be used within a GlobalProvider!!!!");

    return ctx;
};
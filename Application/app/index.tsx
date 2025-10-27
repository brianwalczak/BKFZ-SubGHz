import React, { useEffect, useState } from "react";
import { EventSubscription, StyleSheet, Text, View, Platform, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import BleManager, { BleState } from 'react-native-ble-manager';
import { SafeAreaView } from "react-native-safe-area-context";
import Warning from "../components/warning";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        alignItems: "center",
        width: "100%"
    },
    title: {
        fontFamily: "Open Sans",
        color: "#fff",
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 22
    },
    subtitle: {
        fontFamily: "Open Sans",
        color: "#fff",
        fontSize: 16,
        textAlign: "center",
        marginTop: 6
    },
    content: {
        flex: 1,
        margin: 24,
        padding: 16,
        paddingHorizontal: 30,
        width: '100%'
    },
    button: {
        backgroundColor: "#3B82F6",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 100
    },
    buttonText: {
        color: 'white',
        fontFamily: 'Open Sans',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center'
    }
});

export default function Index() {
    const [permissions, setPermissions] = useState(false);
    const [btState, setBtState] = useState<BleState | null>(null);
    const scanSub = React.useRef<EventSubscription | null>(null);
    const stateSub = React.useRef<EventSubscription | null>(null);
    const [devices, setDevices] = useState<any[]>([]);
    const [connectingId, setConnectingId] = useState<string | null>(null);

    function connect(id: string) {
        if (!permissions) return;
        setConnectingId(id);

        const timeout = setTimeout(() => {
            try {
                BleManager.disconnect(id);
            } catch { };

            setConnectingId(null);
        }, 10000);

        try {
            BleManager.connect(id).then(() => {
                clearTimeout(timeout);

                console.log("Connected to", id);
                setConnectingId(null);
            }).catch((error) => {
                clearTimeout(timeout);

                console.log("Connection error:", error);
                setConnectingId(null);
            });
        } catch {
            clearTimeout(timeout);
            setConnectingId(null);
        }
    }

    // request user permissions on mount, update the state once requested
    useEffect(() => {
        async function requestPermissions() {
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
        }

        requestPermissions();
    }, []);

    // init bluetooth manager once permissions are granted (only once)
    useEffect(() => {
        if (!permissions) return;

        BleManager.start({ showAlert: false }).then(() => {
            BleManager.checkState(); // initial state check

            stateSub.current = BleManager.onDidUpdateState((args: { state: BleState }) => {
                setBtState(args.state);
            });
        });

        return () => {
            stateSub.current?.remove();
        };
    }, [permissions]);

    // handle bluetooth state changes and scanning
    useEffect(() => {
        if (!permissions) return;

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
    }, [btState, permissions]);

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
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Connect your Device</Text>
            <Text style={styles.subtitle}>Choose a Bluetooth device below to connect.</Text>

            <View style={styles.content}>
                {!permissions && (<Warning icon="settings" reason="permissions" />)}
                {permissions && (btState === null || btState === BleState.Unknown || btState === BleState.Resetting || btState === BleState.Unsupported || btState === BleState.Unauthorized) && <Warning icon="bluetooth-disabled" reason="ble-error" />}
                {permissions && (btState !== null && btState !== BleState.On) && <Warning icon="bluetooth-disabled" reason="ble-disabled" />}

                {permissions && (btState === BleState.On) && (
                    <View style={{ marginTop: 20, width: '100%', flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
                            <Text style={{ fontFamily: "Open Sans", color: 'white', fontWeight: 'bold', marginRight: 8 }}>Searching</Text>
                            <ActivityIndicator size="small" color="#aaa" />
                        </View>

                        {devices.length === 0 ? (
                            <Text style={{ fontFamily: "Open Sans", color: '#aaa', textAlign: 'center' }}>Searching for devices, please wait...</Text>
                        ) : (
                            <ScrollView style={{ flex: 1 }}>
                                {devices.map((dev) => (
                                    <View key={dev.id} style={{ padding: 15, marginBottom: 12, backgroundColor: '#111', borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontFamily: "Open Sans", fontWeight: "bold", color: 'white' }}>{dev.name || 'Unknown Device'}</Text>
                                            <Text style={{ fontFamily: "Open Sans", color: '#888', fontSize: 12 }}>{dev.id || '----------------'}</Text>
                                        </View>
                                        <TouchableOpacity style={styles.button} onPress={() => connect(dev.id)} activeOpacity={0.8} disabled={connectingId !== null}>
                                            <Text style={styles.buttonText}>{connectingId === dev.id ? 'Connecting...' : 'Connect'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}
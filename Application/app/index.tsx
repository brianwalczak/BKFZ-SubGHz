import React, { useEffect, useState } from "react";
import { EventSubscription, StyleSheet, Text, View, Platform } from "react-native";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import BleManager, { BleState } from 'react-native-ble-manager';
import { SafeAreaView } from "react-native-safe-area-context";
import Warning from "../components/warning";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        alignItems: "center"
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
        padding: 16
    }
});

export default function Index() {
    const [permissions, setPermissions] = useState(false);
    const [btState, setBtState] = useState<BleState | null>(null);
    const scanSub = React.useRef<EventSubscription | null>(null);
    const stateSub = React.useRef<EventSubscription | null>(null);
    const [devices, setDevices] = useState<any[]>([]);

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
                scanSub.current = BleManager.onDiscoverPeripheral((args: { device: any }) => {
                    setDevices(prev => ([...prev, { ...args.device, lastSeen: Date.now() }]));
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
                    <View style={{ marginTop: 20 }}>
                        <Text style={{ color: 'white', fontFamily: 'Open Sans', textAlign: 'center' }}>
                            Bluetooth is enabled! You can now scan and connect to devices. :D
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}
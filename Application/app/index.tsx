import React, { useEffect, useState } from "react";
import { EventSubscription, StyleSheet, Text, View } from "react-native";
import BleManager, { BleState } from 'react-native-ble-manager';
import { SafeAreaView } from "react-native-safe-area-context";

import BluetoothError from "../components/ble_error";
import BluetoothOff from "../components/ble_off";

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
    const [btState, setBtState] = useState<BleState | null>(null);
    const stateSub = React.useRef<EventSubscription | null>(null);

    useEffect(() => {
        let didMount = true;

        BleManager.start({ showAlert: false }).then(() => {
            BleManager.checkState(); // initial state check

            stateSub.current = BleManager.onDidUpdateState((args: { state: BleState }) => {
                if (didMount) setBtState(args.state);
            });
        });

        return () => {
            didMount = false;
            stateSub.current?.remove();
        };
    }, []);

    useEffect(() => {
        if (btState === BleState.Off) {
            try {
                BleManager.enableBluetooth().catch(() => {
                    return;
                });
            } catch { };
        }
    }, [btState]);

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Connect your Device</Text>
            <Text style={styles.subtitle}>Choose a Bluetooth device below to connect.</Text>

            <View style={styles.content}>
                {(btState === null || btState === BleState.Unknown || btState === BleState.Resetting || btState === BleState.Unsupported || btState === BleState.Unauthorized) && <BluetoothError />}
                {(btState !== null && btState !== BleState.On) ? <BluetoothOff /> : <Text style={{ color: "green" }}>Bluetooth State: Powered On</Text>}
            </View>
        </SafeAreaView>
    );
}
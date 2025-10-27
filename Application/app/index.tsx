import React, { useState } from "react";
import { EventSubscription, StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import BleManager, { BleState } from 'react-native-ble-manager';
import { SafeAreaView } from "react-native-safe-area-context";
import Warning from "../components/warning";
import { useGlobal } from "./GlobalContext";
import { useRouter } from "expo-router";

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
    const { permissions, btState, devices, connectDevice } = useGlobal();
    const [connectingId, setConnectingId] = useState<string | null>(null);
    const router = useRouter();

    async function connect(id: string) {
        if (!permissions) return;
        setConnectingId(id);

        const success = await connectDevice(id);
        setConnectingId(null);

        if (success) {
            router.replace("/home"); // navigate to home page
        }
    }

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
                                {devices.map((dev: any) => (
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
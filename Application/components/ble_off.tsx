import React from "react";
import { TouchableOpacity, Linking, Platform, Text, View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const styles = StyleSheet.create({
    title: {
        fontFamily: 'Open Sans',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10,
        color: 'white'
    },
    subtitle: {
        fontFamily: 'Open Sans',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 6,
        textAlign: 'center',
        color: '#aaa'
    },
    button: {
        marginTop: 22,
        backgroundColor: '#3B82F6',
        paddingVertical: 10,
        paddingHorizontal: 34,
        borderRadius: 100
    },
    buttonText: {
        color: 'white',
        fontFamily: 'Open Sans',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center'
    }
});

function openSettings() {
    if (Platform.OS === 'android') {
        Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS");
    } else if (Platform.OS === 'ios') {
        Linking.openURL('App-Prefs:Bluetooth');
    }
}

export default function BluetoothOff() {
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <MaterialIcons name="bluetooth-disabled" size={60} color="#3B82F6" />
            <Text style={styles.title}>Bluetooth is Off</Text>
            <Text style={styles.subtitle}>Bluetooth is required to connect your device.</Text>

            <TouchableOpacity style={styles.button} onPress={openSettings} activeOpacity={0.8}>
                <Text style={styles.buttonText}>Open Settings</Text>
            </TouchableOpacity>
        </View>
    );
};
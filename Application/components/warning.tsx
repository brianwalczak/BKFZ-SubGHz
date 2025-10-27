import React from "react";
import { TouchableOpacity, Linking, Platform, Text, View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import RNExitApp from 'react-native-exit-app';

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

const activity = {
    'ble-disabled': {
        title: 'Bluetooth is Off',
        subtitle: 'Bluetooth is required to connect your device.',
        primaryColor: '#3B82F6',
        buttonText: 'Open Settings',
        action: openBluetooth
    },
    'ble-error': {
        title: 'Unsupported Device',
        subtitle: 'Your device does not support Bluetooth connection.',
        primaryColor: '#DC2626',
        buttonText: 'Close Application',
        action: closeApplication
    },
    'permissions': {
        title: 'Permissions Required',
        subtitle: 'Bluetooth permissions are required to connect your device.',
        primaryColor: '#DC2626',
        buttonText: 'Open Settings',
        action: openSettings
    }
} as const;

interface Props {
    reason?: (keyof typeof activity);
    icon?: string;
}

function openSettings() {
    if (Platform.OS === 'android') {
        Linking.openSettings();
    } else if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
    }
}

function openBluetooth() {
    if (Platform.OS === 'android') {
        Linking.sendIntent("android.settings.BLUETOOTH_SETTINGS");
    } else if (Platform.OS === 'ios') {
        Linking.openURL('App-Prefs:Bluetooth');
    }
}

function closeApplication() {
    try {
        RNExitApp.exitApp(); // try closing app
    } catch {
        openSettings(); // fallback to settings
    }
}

export default function Warning({ reason = 'permissions', icon = 'bluetooth-disabled' }: Props) {
    return (
        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <MaterialIcons name={icon as any} size={60} color={activity[reason].primaryColor} />
            <Text style={styles.title}>{activity[reason].title}</Text>
            <Text style={styles.subtitle}>{activity[reason].subtitle}</Text>

            <TouchableOpacity style={[styles.button, { backgroundColor: activity[reason].primaryColor }]} onPress={activity[reason].action} activeOpacity={0.8}>
                <Text style={styles.buttonText}>{activity[reason].buttonText}</Text>
            </TouchableOpacity>
        </View>
    );
};
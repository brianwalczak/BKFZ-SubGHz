import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Feather from "@expo/vector-icons/Feather";
import ESP32 from "../assets/svg/esp32";
import { useRouter } from "expo-router";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        alignItems: "center",
        width: "100%",
        paddingTop: 50
    },
    title: {
        fontFamily: "Roboto",
        color: "#fff",
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 28
    },
    subtitle: {
        fontFamily: "Roboto",
        color: "#fff",
        fontSize: 18,
        textAlign: "center",
        marginTop: 6
    },
    small: {
        fontFamily: "Roboto",
        color: "#ccc",
        fontSize: 14,
        textAlign: "center",
        marginTop: 12
    },
    content: {
        flex: 1,
        margin: 24,
        padding: 16,
        paddingHorizontal: 30,
        width: '100%'
    },
    iconRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: -90,
        marginTop: -70
    },
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: 20
    },
    button: {
        backgroundColor: "#3B82F6",
        paddingVertical: 14,
        width: '90%',
        borderRadius: 100
    },
    buttonText: {
        color: 'white',
        fontFamily: 'Roboto',
        fontSize: 17,
        fontWeight: 'bold',
        textAlign: 'center'
    }
});

export default function Index() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Welcome! Let&apos;s Connect.</Text>
            <View style={styles.content}>
                <View style={styles.iconRow}>
                    <Feather name="bluetooth" size={130} color={'#3B82F6'} style={{ marginRight: 10 }} />
                    <ESP32 width={200} />
                </View>
                <Text style={styles.subtitle}>Turn on your BKFZ SubGHz to enable Bluetooth connection.</Text>
            </View>
            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={() => router.push("/connect")}>
                    <Text style={styles.buttonText}>Connect</Text>
                </TouchableOpacity>
                <Text style={styles.small}>Bluetooth must be enabled on this device.</Text>
            </View>
        </SafeAreaView>
    );
}
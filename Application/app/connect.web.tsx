import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobal } from "../providers/GlobalContext";
import Back from "../components/back";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        alignItems: "center",
        width: "100%",
        paddingTop: 10
    },
    title: {
        fontFamily: "Roboto",
        color: "#fff",
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 22
    },
    content: {
        flex: 1,
        margin: 30,
        padding: 16,
        paddingHorizontal: 18,
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
        fontFamily: 'Roboto',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center'
    }
});

export default function Index() {
    const { connectDevice } = useGlobal();

    return (
        <SafeAreaView style={styles.container}>
            <Back action="back" />
            <Text style={styles.title}>Connect your Device</Text>

            <View style={styles.content}>
                <TouchableOpacity style={[styles.button]} onPress={connectDevice} activeOpacity={0.8}>
                    <Text style={styles.buttonText}>Connect Device</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
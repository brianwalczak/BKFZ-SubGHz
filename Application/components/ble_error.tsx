import React from "react";
import { Text } from "react-native";

export default function BluetoothError() {
    return (<Text style={{ color: "red" }}>It looks like Bluetooth is not supported for your device.</Text>);
};
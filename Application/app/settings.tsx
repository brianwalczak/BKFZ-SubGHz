import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useGlobal } from "../providers/GlobalContext";
import Back from "../components/back";
import { settingsOptions } from "../providers/utils";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 100
  },
  title: {
    fontFamily: "Press Start 2P",
    color: "#fff",
    fontSize: 28,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: "Roboto",
    color: "#d3d3d3",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 25,
    width: 300,
    marginVertical: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Press Start 2P",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    width: 350,
    justifyContent: "space-between",
  },
  label: {
    color: "#fff",
    fontSize: 20,
    flex: 1,
  },
  value: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 18,
  },
  selected: {
    padding: 10,
    backgroundColor: "#2b2b2b",
    borderRadius: 10,
    width: 130,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default function Settings() {
  const { updateSettings, settings, setMessage } = useGlobal();
  const [position, setPosition] = useState<any>(null);

  useEffect(() => {
    if (settings && settings?.preset && settings?.frequency && settings?.rssi) {
      setPosition({
        preset: (settingsOptions.preset.indexOf(settings.preset) || 0),
        frequency: (settingsOptions.frequency.indexOf(settings.frequency) || 0),
        rssi: (settingsOptions.rssi.indexOf(settings.rssi) || 0)
      });
    }
  }, [settings]);

  const handleMove = useCallback((key: string, dir: -1 | 1) => {
    setPosition((prev: any) => {
      const max = settingsOptions[key].length - 1;
      let next = prev[key] + dir;

      if (next < 0) next = 0;
      if (next > max) next = max;
      return { ...prev, [key]: next };
    });
  }, []);

  const getDisplayValue = useCallback((key: string) => {
    if (!position) return "";

    const val = settingsOptions[key][position[key]];

    if (key === "frequency") return (val / 1000000).toFixed(2) + " MHz";
    if (key === "rssi") return val === -200 ? "- - - - -" : val + " dBm";
    return val;
  }, [position]);

  const saveSettings = useCallback(async () => {
    if (!position) return;
    
    const newSettings: any = {
      preset: settingsOptions.preset[position.preset],
      frequency: settingsOptions.frequency[position.frequency],
      rssi: settingsOptions.rssi[position.rssi],
    };

    const save = await updateSettings(newSettings, true);
    if (save) {
      setMessage(['Your settings have been saved successfully!', 'success']);
    } else {
      setMessage(['Failed to save settings. Please try again.', 'error']);
    }

    setTimeout(() => setMessage(null), 2000);
  }, [position, setMessage, updateSettings]);

  if (!settings || !position) return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Back action="back" />
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Manage SubGHz settings and modulation.</Text>

      {Object.keys(settingsOptions).map((key) => (
        <View style={styles.optionRow} key={key}>
          <Text style={styles.label}>{key === "preset" ? "Preset" : key === "frequency" ? "Frequency" : key === 'rssi' ? "RSSI Threshold" : 'Unknown'}</Text>
          <TouchableOpacity style={[{ padding: 8 }, position[key] === 0 && { opacity: 0.3 }]} disabled={position[key] === 0} onPress={() => handleMove(key, -1)}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={[styles.value, styles.selected]}>{getDisplayValue(key)}</Text>

          <TouchableOpacity style={[{ padding: 8 }, position[key] === settingsOptions[key].length - 1 && { opacity: 0.3 }]} disabled={position[key] === settingsOptions[key].length - 1} onPress={() => handleMove(key, 1)}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={[styles.button, { backgroundColor: "#28a745" }]} activeOpacity={0.8} onPress={() => saveSettings()}>
        <Text style={styles.buttonText}>Save Settings</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
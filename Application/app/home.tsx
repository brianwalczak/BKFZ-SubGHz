import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobal } from "../providers/GlobalContext";
import { useNavigation } from "expo-router";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: "Press Start 2P",
    color: "#fff",
    fontSize: 28,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: "Open Sans",
    color: "#d3d3d3",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#0632d1",
    borderRadius: 8,
    paddingVertical: 25,
    width: 300,
    marginVertical: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Press Start 2P",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  disconnectContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  disconnectText: {
    color: "#ff4d4d",
    fontFamily: "Open Sans",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "bold",
  },
});

export default function Home() {
  const { disconnectDevice } = useGlobal();
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>BKFZ SubGHz</Text>
      <Text style={styles.subtitle}>Easily read SubGHz communication protocols.</Text>

      <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={() => navigation.navigate("record" as never)}>
        <Text style={styles.buttonText}>Read</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={() => navigation.navigate("play" as never)}>
        <Text style={styles.buttonText}>Play from File</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={() => navigation.navigate("analyzer" as never)}>
        <Text style={[styles.buttonText, { fontSize: 14 }]}>Frequency Analyzer</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={() => navigation.navigate("settings" as never)}>
        <Text style={styles.buttonText}>Settings</Text>
      </TouchableOpacity>

      <View style={styles.disconnectContainer}>
        <TouchableOpacity activeOpacity={0.7} onPress={disconnectDevice}>
          <Text style={styles.disconnectText}>Disconnect Device</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
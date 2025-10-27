import * as Font from "expo-font";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GlobalProvider } from "../providers/GlobalContext";

export default function RootLayout() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      await Font.loadAsync({
        "Open Sans": require("../assets/fonts/Open_Sans.ttf"),
        "Press Start 2P": require("../assets/fonts/Press_Start_2P.ttf")
      });
      setLoaded(true);
    })();
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <GlobalProvider><Stack screenOptions={{
    headerShown: false
  }} /></GlobalProvider>;
}
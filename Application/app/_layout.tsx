import * as Font from "expo-font";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, Animated } from "react-native";
import { GlobalProvider, useGlobal } from "../providers/GlobalContext";
import { SafeAreaView } from "react-native-safe-area-context";

function MessageBanner() {
  const { message, setMessage } = useGlobal();
  const [visible, setVisible] = useState(false);
  const opacity = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (message) {
      setVisible(true);

      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setMessage(null);
          setVisible(false);
        });
      }, message[2]);

      return () => {
        clearTimeout(timer);
        
        opacity.setValue(0);
        setVisible(false);
      };
    }
  }, [message, setMessage, opacity]);

  if (!message || !visible) return null;

  return (
    <SafeAreaView style={{ position: "absolute", bottom: 40, left: 30, right: 30 }}>
      <Animated.View
        style={{
          opacity,
          backgroundColor: message[1] === "success" ? "#28a745" : message[1] === "error" ? "#dc3545" : "#fff",
          padding: 16,
          borderRadius: 10,
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5,
          zIndex: 100
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, textAlign: "center" }}>{message[0]}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      await Font.loadAsync({
        "Roboto": require("../assets/fonts/Roboto.ttf"),
        "Press_Start_2P": require("../assets/fonts/Press_Start_2P.ttf")
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

  return (
    <GlobalProvider>
      <Stack screenOptions={{
        headerShown: false
      }} />
      <MessageBanner />
    </GlobalProvider>
  );
}
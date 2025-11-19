import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Href, useRouter } from "expo-router";

export default function Back({ action, location = null, force = false }: { action: 'back' | 'go', location?: Href | null, force?: boolean }) {
    const router = useRouter();

    return (
        <SafeAreaView style={{ position: "absolute", left: 15, top: 10, display: (action === 'back' && !router.canGoBack() && !(typeof window !== 'undefined' && window.history.length > 1)) ? "none" : undefined }}>
            <TouchableOpacity onPress={() => {
                if (action === 'back') {
                    if (router.canGoBack()) {
                        router.back();
                    } else if(typeof window !== 'undefined' && window.history.length > 1) {
                        window.history.back();
                    }
                } else if (action === 'go' && location) {
                    if (force) {
                        router.replace(location);
                    } else {
                        router.push(location);
                    }
                }
            }}>
                <Feather name="chevron-left" size={30} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};
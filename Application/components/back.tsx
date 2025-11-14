import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { TouchableOpacity } from "react-native";
import { Feather } from '@expo/vector-icons';
import { Href, useRouter } from "expo-router";

export default function Back({ action, location = null, force = false }: { action: 'back' | 'go', location?: Href | null, force?: boolean }) {
    const router = useRouter();

    return (
        <SafeAreaView style={{ position: "absolute", left: 15, top: 10 }}>
            <TouchableOpacity onPress={() => {
                if (action === 'back') {
                    router.back();
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
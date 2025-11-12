import { File } from 'expo-file-system';

// Converts files into a readable sample format
export function convertFile(data: string) {
    const samplesArray = [];
    let frequency = 0;
    let preset = "";
    const lines = data.split("\n");

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("Frequency:")) {
            frequency = Number(lines[i].split('Frequency: ')[1]);
        }

        if (lines[i].includes("Preset:")) {
            preset = lines[i].split("Preset: ")[1];

            preset = preset.replaceAll('FuriHalSubGhzPresetOok270Async', 'AM270');
            preset = preset.replaceAll('FuriHalSubGhzPresetOok650Async', 'AM650');
            preset = preset.replaceAll('FuriHalSubGhzPreset2FSKDev238Async', 'FM238');
            preset = preset.replaceAll('FuriHalSubGhzPreset2FSKDev238Async', 'FM476');
        }

        if (lines[i].includes("RAW_Data:")) {
            const dataString = lines[i].replace("RAW_Data: ", "").trim();
            const samples = dataString.split(" ");
            for (let s = 0; s < samples.length; s++) {
                samplesArray.push(parseInt(samples[s]));
            }
        }
    }

    return {
        samples: samplesArray,
        frequency: frequency,
        preset: preset
    };
}

export function convertSamples(preset: string, frequency: number, samples: number[]) {
    let prepend = "";
    preset = preset.replace("AM270", "FuriHalSubGhzPresetOok270Async");
    preset = preset.replace("AM650", "FuriHalSubGhzPresetOok650Async");
    preset = preset.replace("FM238", "FuriHalSubGhzPreset2FSKDev238Async");
    preset = preset.replace("FM476", "FuriHalSubGhzPreset2FSKDev238Async");

    let result = "Filetype: Flipper SubGhz RAW File\nVersion: 1\n# Created with BKFZ SubGHz\nFrequency: " + frequency.toString() + "\nPreset: " + preset + "\nProtocol: RAW\nRAW_Data: ";

    if (samples[0] < 0) {
        samples = samples.slice(1);
    }

    for (let i = 0; i < samples.length; i++) {
        const valueToAdd = prepend + samples[i].toString();
        result += valueToAdd;
        prepend = " ";

        if ((i + 1) % 512 === 0) {
            result += "\nRAW_Data: ";
            prepend = "";
        }
    }

    return result;
}

// Reads file content from a given URI (local file path)
export async function readFileContent(uri: string) {
    try {
        const file = new File(uri);
        const text = await file.text();

        return text;
    } catch (error) {
        return null;
    }
}

// The available options for each setting (used to display on UI)
export const settingsOptions = {
    preset: ["AM270", "AM650", "FM238", "FM476"], // Presets
    frequency: [ // Frequency
        /* 300 - 348 */
        300000000,
        303875000,
        304250000,
        310000000,
        315000000,
        318000000,

        /* 387 - 464 */
        390000000,
        418000000,
        433075000,
        433420000,
        433920000,
        434420000,
        434775000,
        438900000,

        /* 779 - 928 */
        868350000,
        915000000,
        925000000,
    ],
    rssi: [-200, -85, -80, -75, -70, -65, -60, -55, -50, -45, -40] // RSSI threshold
};
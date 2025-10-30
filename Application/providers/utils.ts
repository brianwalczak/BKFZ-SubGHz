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
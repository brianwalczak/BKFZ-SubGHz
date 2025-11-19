const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const extensions = ['.html', '.ttf', '.json', '.js'];

async function collFiles(dir) {
    let files = [];
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const filePath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files = files.concat(await collFiles(filePath));
        } else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
            files.push(filePath);
        }
    }

    return files;
}

(async () => {
    const filePaths = await collFiles('./dist/');

    if (!fs.existsSync('./web')) {
        fs.mkdirSync('./web');
    } else {
        fs.rmSync('./web', { recursive: true });
    }

    for (const filePath of filePaths) {
        console.log(`\x1b[33mCompressing file: ${filePath}\x1b[0m`);
        const data = zlib.gzipSync(fs.readFileSync(filePath));

        const relative = path.relative('./dist', filePath);
        const dir = path.join('./web', path.dirname(relative));

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        if (data === null) {
            console.warn(`\x1b[31mFailed to compress file: ${filePath}, copying original.\x1b[0m`);
            fs.copyFileSync(filePath, path.join(dir, path.basename(filePath)));
            continue;
        }

        fs.writeFileSync(path.join(dir, path.basename(filePath) + '.gz'), data);
    }

    console.log('\x1b[32mAll files compressed successfully.\x1b[0m');
})();
import Clang from './public/llvm-wasm/clang.js';
import fs from 'fs';
async function run() {
    const clang = await Clang({
        locateFile: (path) => './public/llvm-wasm/bin/' + path
    });
    clang.FS.writeFile('main.cpp', '#include <iostream>\nusing namespace std;\nint main() { cout << "Hello"; return 0; }');
    const exitCode = await clang.callMain(['-c', '-O2', 'main.cpp', '-o', 'main.o']);
    console.log('Exit Code:', exitCode);
    console.log('Exists:', clang.FS.analyzePath('main.o').exists);
    fs.writeFileSync('main.o', clang.FS.readFile('main.o'));
}
run().catch(console.error);

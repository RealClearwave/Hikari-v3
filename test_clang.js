const Clang = require('./public/llvm-wasm/clang.js');
async function run() {
    const clang = await Clang({
        locateFile: (path) => './public/llvm-wasm/bin/' + path
    });
    clang.FS.writeFile('main.c', 'int main() { return 0; }');
    await clang.callMain(['-c', '--target=wasm32-wasi', '-O2', 'main.c', '-o', 'main.o']);
    console.log('Exists:', clang.FS.analyzePath('main.o').exists);
    // write main.o out
    require('fs').writeFileSync('main.o', clang.FS.readFile('main.o'));
}
run().catch(console.error);

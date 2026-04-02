
import Clang from './public/llvm-wasm/clang.js';
import Lld from './public/llvm-wasm/lld.js';
async function run() {
    let err = '';
    const locateFile = path => './public/llvm-wasm/bin/' + path.replace('bin/', '');
    const clang = await Clang({ locateFile, printErr: t => err += t + '
' });
    clang.FS.writeFile('main.cpp', 'int main() { return 0; }');
    await clang.callMain(['-c', '-std=c++17', '--target=wasm32-wasi', '-fvisibility=default', 'main.cpp', '-o', 'main.o']);
    const mainO = clang.FS.readFile('main.o');

    err = '';
    const lld = await Lld({ locateFile, printErr: t => err += t + '
' });
    lld.FS.writeFile('main.o', mainO);
    const code = await lld.callMain([
        '-flavor', 'wasm',
        '-L/lib/wasm32-wasi',
        '/lib/wasm32-wasi/crt1.o',
        'main.o',
        '-lc++', '-lc++abi', '-lc',
        '/lib/clang/14.0.6/lib/wasi/libclang_rt.builtins-wasm32.a',
        '-o', 'main.wasm'
    ]);
import('fode !== 0) { console.log('LLimport Clang from './public/llvm-wxOimport Lld from './public/llvm-wasm/lld.console.lasync function run() {
    let err = > consol   og('ERR', e.message)   
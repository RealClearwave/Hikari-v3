import Clang from './public/llvm-wasm/clang.js';
import Lld from './public/llvm-wasm/lld.js';

async function run() {
    let err = '';
    const locateFile = path => './public/llvm-wasm/bin/' + path.replace('bin/', '');
    const clang = await Clang({ locateFile, printErr: t => { err += t + '\n'; } });
    clang.FS.writeFile('main.cpp', 'int main() { return 0; }');
    await clang.callMain(['-c', '-O3', '--target=wasm32-wasi', '-fvisibility=default', 'main.cpp', '-o', 'main.o']);
    const mainO = clang.FS.readFile('main.o');

    err = '';
    const lld = await Lld({ locateFile, printErr: t => { err += t + '\n'; } });
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
    if (code !== 0) { console.log('LLD FAILED:\n', err); }
    else console.log('LLD SUCCESS!');
}
run();
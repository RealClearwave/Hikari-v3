import { init, WASI } from 'https://esm.sh/@wasmer/wasi@1.1.2';
import Clang from './public/llvm-wasm/clang.js';
import Lld from './public/llvm-wasm/lld.js';

async function run() {
    await init();
    const locateFile = path => './public/llvm-wasm/bin/' + path.replace('bin/', '');
    const clang = await Clang({ locateFile });
    clang.FS.writeFile('main.cpp', 'int main() { return 0; }');
    await clang.callMain(['-c', 'main.cpp']);
    const mainO = clang.FS.readFile('main.o');

    const lld = await Lld({ locateFile });
    lld.FS.writeFile('main.o', mainO);
    const code = await lld.callMain([
        '-flavor',
        'wasm',
        '-L/lib/wasm32-wasi',
        '-lc',
        '-lc++',
        '-lc++abi',
        '/lib/clang/14.0.6/lib/wasi/libclang_rt.builtins-wasm32.a',
        '/lib/wasm32-wasi/crt1.o',
        'main.o',
        '-o',
        'main.wasm',
    ]);
    console.log('LLD exit code:', code);
}
run().catch(console.error);

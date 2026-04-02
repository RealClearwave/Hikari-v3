import { init, WASI } from 'https://esm.sh/@wasmer/wasi@1.1.2'
import Clang from './clang.js'
import Lld from './lld.js'

await init()

export const compileAndRun = async (sourceCode, stdInput = '', language = 'c') => {
    let clangOutput = '';
    let clangErr = '';
    const normalizedLanguage = language === 'cpp' ? 'cpp' : 'c';
    const sourceFile = normalizedLanguage === 'cpp' ? 'main.cpp' : 'main.c';
    
    const locateFile = (path, prefix) => {
        if (path === 'clang.data' || path === 'lld.data' || path.endsWith('.data')) {
            return '/llvm-wasm/bin/' + path.replace('bin/', '');
        }
        return '/llvm-wasm/' + path;
    };

    const clang = await Clang({
        print: text => { clangOutput += text + '\n'; },
        printErr: text => { clangErr += text + '\n'; },
        locateFile
    });
    
    clang.FS.writeFile(sourceFile, sourceCode);
    const clangArgs = normalizedLanguage === 'cpp'
        ? ['-std=c++17', '--target=wasm32-wasi', '-fvisibility=default', '-c', sourceFile, '-o', 'main.o']
        : ['--target=wasm32-wasi', '-fvisibility=default', '-c', sourceFile, '-o', 'main.o'];
        
    const clangStatus = await clang.callMain(clangArgs);
    
    if (clangStatus !== 0 || !clang.FS.analyzePath('main.o').exists) {
        throw new Error(`Compile failed (Exit code: ${clangStatus}).\n\nStderr:\n${clangErr}\n\nStdout:\n${clangOutput}`);
    }
    const mainO = clang.FS.readFile('main.o');

    let lldOutput = '';
    let lldErr = '';
    const lld = await Lld({
        print: text => { lldOutput += text + '\n'; },
        printErr: text => { lldErr += text + '\n'; },
        locateFile
    });
    
    lld.FS.writeFile('main.o', mainO);
    const lldStatus = await lld.callMain([
        '-flavor', 'wasm',
        '-L/lib/wasm32-wasi',
        '/lib/wasm32-wasi/crt1.o',
        'main.o',
        '-lc++', '-lc++abi', '-lc',
        '/lib/clang/14.0.6/lib/wasi/libclang_rt.builtins-wasm32.a',
        '--export=main',
        '-o', 'main.wasm'
    ]);
    
    if (lldStatus !== 0 || !lld.FS.analyzePath('main.wasm').exists) {
        throw new Error(`Link failed (Exit code: ${lldStatus}).\n\nStderr:\n${lldErr}\n\nStdout:\n${lldOutput}`);
    }
    const mainWasm = lld.FS.readFile('main.wasm');

    const wasi = new WASI({});
    
    if (stdInput && typeof wasi.setStdinString === 'function') {
        wasi.setStdinString(stdInput);
    }
    
    const originalPrompt = window.prompt;
    if (stdInput) {
        let lines = stdInput.split('\n');
        window.prompt = () => {
            if (lines.length > 0) return lines.shift();
            return null;
        };
    }

    try {
        const module = await WebAssembly.compile(mainWasm);
        const instance = await WebAssembly.instantiate(module, {
            ...wasi.getImports(module)
        });

        wasi.start(instance);
        const stdout = await wasi.getStdoutString();
        return stdout;
    } finally {
        window.prompt = originalPrompt;
    }
};

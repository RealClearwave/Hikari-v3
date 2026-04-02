import { init, WASI } from 'https://esm.sh/v135/@wasmer/wasi@1.1.2/es2022/wasi.mjs'

await init()
const wasi = new WASI({})
console.log(Object.keys(wasi.__proto__ || wasi))

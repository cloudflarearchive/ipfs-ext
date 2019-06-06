type Variant = 'RFC3548' | 'RFC4648' | 'RFC4648-HEX' | 'Crockford'
interface Options { padding?: boolean }
declare function base32Encode(buffer: ArrayBuffer, variant: Variant, options?: Options): string
export = base32Encode

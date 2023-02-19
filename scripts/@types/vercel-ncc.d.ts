declare module '@vercel/ncc' {
    export interface Options<Watch extends boolean = false> {
        /** Custom cache path, or `false` to disable caching */
        cache?: string | false;

        /** External packages to leave as required of the build */
        externals?: string[];

        /** Directory outside of  which never to emit assets in */
        filterAssetBase?: string;

        /** Minifies the output content */
        minify?: boolean;

        /** Generates sourcemaps when building */
        sourceMap?: boolean;

        /** Relative path to treat sources from into the related sourcemap */
        sourceMapBasePrefix?: string;

        /** When outputted, the file includes `source-map-support` in the output file; increases output by ~32KB */
        sourceMapRegister?: boolean;

        /** Whether to watch the input files to build the finialized output */
        watch?: Watch;

        /** Generates a licenses file in the final output */
        license?: string;

        quiet?: boolean;
        debugLog?: boolean;
        v8cache?: boolean;
        assetBuilds?: boolean;
    }

    export interface OutputResult {
        code: string;
        map?: string;
        assets: Record<string, { source: Buffer; permissions?: any }>;
        symlinks: Record<string, any>;
        stats: any;
    }

    export interface Watcher {
        handler({ err, code, map, assets }: OutputResult & { err?: Error }): void;
        rebuild(callback: () => void): void;
        close(): void;
    }

    function ncc(input: string, options: Options<false>): Promise<OutputResult>;
    function ncc(input: string, options: Options<true>): Promise<Watcher>;

    export default ncc;
}

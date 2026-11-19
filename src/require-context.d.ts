// webpack's require.context, used to discover blog posts at build time
interface NodeRequire {
  context(
    directory: string,
    useSubdirectories: boolean,
    regExp: RegExp,
  ): {
    keys(): string[];
    (id: string): unknown;
  };
}

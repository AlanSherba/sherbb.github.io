// Shared loading for folders of Markdown files (blog posts, projects).
//
// Each file may start with a header block between --- lines. A header line
// is either "key: value" or "key:" followed by a list of "  - item" lines:
//
//   ---
//   title: My Page
//   gallery:
//     - one.png
//     - two.png
//   ---
//
// Keys are case-insensitive (read them in lowercase).

export type HeaderValue = string | string[];

export interface MarkdownFile {
  slug: string; // file name without .md
  fields: Record<string, HeaderValue>;
  body: string;
}

// The result of webpack's require.context for a folder of .md files
type MarkdownContext = ReturnType<NodeRequire["context"]>;

const HEADER = /^---\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(\r?\n|$)/;
const LIST_ITEM = /^\s+-\s+(.*)$/;

// Allow optional quotes around a value
const unquote = (value: string): string =>
  value.trim().replace(/^(["'])(.*)\1$/, "$2");

const parseMarkdownFile = (slug: string, text: string): MarkdownFile =>
{
  const match = text.match(HEADER);
  const fields: Record<string, HeaderValue> = {};
  if (match)
  {
    let listKey: string | null = null;
    for (const line of match[1].split(/\r?\n/))
    {
      const item = line.match(LIST_ITEM);
      if (item && listKey)
      {
        (fields[listKey] as string[]).push(unquote(item[1]));
        continue;
      }
      listKey = null;
      const colon = line.indexOf(":");
      if (colon < 0)
      {
        continue;
      }
      const key = line.slice(0, colon).trim().toLowerCase();
      const value = unquote(line.slice(colon + 1));
      if (value === "")
      {
        // An empty value starts a list
        fields[key] = [];
        listKey = key;
      }
      else
      {
        fields[key] = value;
      }
    }
  }

  return {
    slug,
    fields,
    body: match ? text.slice(match[0].length) : text,
  };
};

// Each .md file is bundled as a static asset; requiring it gives its URL
export const loadMarkdownFiles = async (
  files: MarkdownContext,
): Promise<MarkdownFile[]> =>
{
  const keys = files.keys().filter((key) => key.startsWith("./"));
  return Promise.all(
    keys.map(async (key) =>
    {
      const asset = files(key) as string | { default: string };
      const url = typeof asset === "string" ? asset : asset.default;
      const text = await (await fetch(url)).text();
      return parseMarkdownFile(key.slice(2).replace(/\.md$/, ""), text);
    }),
  );
};

export const textField = (file: MarkdownFile, key: string): string =>
{
  const value = file.fields[key];
  return typeof value === "string" ? value : "";
};

// Category headers in the order they first appear
export const categoriesInOrder = (
  items: readonly { category: string }[],
): string[] => Array.from(new Set(items.map((item) => item.category)));

// Media paths in Markdown are relative to public/images/ (e.g.
// gridform/shot.png or blog/photo.png). Full URLs and absolute paths are
// used as written.
export const resolveMediaUrl = (src = ""): string =>
  /^([a-z]+:|\/)/i.test(src)
    ? src
    : process.env.PUBLIC_URL + "/images/" + src;

export const isVideoPath = (src: string): boolean =>
  /\.(mp4|webm)$/i.test(src);

// Every image or video referenced with ![alt](path) in a Markdown body
export const markdownMediaPaths = (body: string): string[] =>
  Array.from(body.matchAll(/!\[[^\]]*\]\(\s*<?([^\s)>]+)/g), (m) => m[1]);

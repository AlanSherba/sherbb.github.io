// Blog posts are Markdown files in src/blog. The file name is the post's
// URL slug (?tab=blog&post=<slug>). Each file starts with a header block:
//
//   ---
//   title: My Post
//   subtitle: A short line for the list
//   date: 2026-11-19
//   category: Notes        (optional)
//   ---
//
// Images and videos go in public/images/blog/ and are referenced by file
// name only: ![alt](my-image.png)

export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  date: string; // YYYY-MM-DD
  category: string;
  body: string;
}

const DEFAULT_CATEGORY = "Posts";

// Each .md file is bundled as a static asset; require gives back its URL
const postFiles = require.context("./blog", false, /\.md$/);

const HEADER = /^---\r?\n([\s\S]*?)\r?\n---[^\S\r\n]*(\r?\n|$)/;

const parsePost = (slug: string, text: string): BlogPost =>
{
  const match = text.match(HEADER);
  const fields: Record<string, string> = {};
  if (match)
  {
    for (const line of match[1].split(/\r?\n/))
    {
      const colon = line.indexOf(":");
      if (colon < 0)
      {
        continue;
      }
      const key = line.slice(0, colon).trim().toLowerCase();
      // Allow optional quotes around the value
      const value = line
        .slice(colon + 1)
        .trim()
        .replace(/^(["'])(.*)\1$/, "$2");
      fields[key] = value;
    }
  }

  return {
    slug,
    title: fields.title || slug,
    subtitle: fields.subtitle || "",
    date: fields.date || "",
    category: fields.category || DEFAULT_CATEGORY,
    body: match ? text.slice(match[0].length) : text,
  };
};

export const loadBlogPosts = async (): Promise<BlogPost[]> =>
{
  const keys = postFiles.keys().filter((key) => key.startsWith("./"));
  const posts = await Promise.all(
    keys.map(async (key) =>
    {
      const asset = postFiles(key) as string | { default: string };
      const url = typeof asset === "string" ? asset : asset.default;
      const text = await (await fetch(url)).text();
      const slug = key.slice(2).replace(/\.md$/, "");
      return parsePost(slug, text);
    }),
  );
  // Newest first. ISO dates sort correctly as strings.
  return posts.sort((a, b) => b.date.localeCompare(a.date));
};

// Category headers in the order they first appear in the sorted list
export const blogCategories = (posts: readonly BlogPost[]): string[] =>
  Array.from(new Set(posts.map((post) => post.category)));

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "2026-11-19" -> "November 19, 2026". Parsed by hand to avoid time zone shifts.
export const formatPostDate = (date: string): string =>
{
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day || month > 12)
  {
    return date;
  }
  return `${MONTHS[month - 1]} ${day}, ${year}`;
};

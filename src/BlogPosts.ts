import { categoriesInOrder, loadMarkdownFiles, textField } from "./MarkdownFiles";

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
// Images and videos go in public/images/blog/ and are referenced relative
// to public/images/: ![alt](blog/my-image.png)

export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  date: string; // YYYY-MM-DD
  category: string;
  body: string;
}

const postFiles = require.context("./blog", false, /\.md$/);

let loading: Promise<BlogPost[]> | null = null;

// Loaded once and shared. Newest first; ISO dates sort correctly as strings.
export const loadBlogPosts = (): Promise<BlogPost[]> =>
{
  loading ??= loadMarkdownFiles(postFiles).then((files) =>
    files
      .map((file) => ({
        slug: file.slug,
        title: textField(file, "title") || file.slug,
        subtitle: textField(file, "subtitle"),
        date: textField(file, "date"),
        category: textField(file, "category") || "Posts",
        body: file.body,
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  return loading;
};

export const blogCategories = (posts: readonly BlogPost[]) =>
  categoriesInOrder(posts);

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

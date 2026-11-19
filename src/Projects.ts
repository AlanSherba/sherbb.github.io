import
{
  categoriesInOrder,
  loadMarkdownFiles,
  textField,
} from "./MarkdownFiles";

// Projects are Markdown files in src/projects. The list follows the file
// names, so the number prefix sets the order (01-..., 02-...); the first
// project is the one shown by default. Categories appear in the order of
// their first project. Each file starts with a header block for the list:
//
//   ---
//   title: Gridform             (used as the URL key: ?project=Gridform)
//   subtitle: Published Indie Game
//   year: 22
//   category: Favorites
//   ---
//
// Everything on the page is the Markdown body: text, links, images and
// videos (![](gridform/shot.png), paths relative to public/images/).

export interface ProjectData {
  title: string;
  subtitle: string;
  year: string;
  category: string;
  body: string;
}

const projectFiles = require.context("./projects", false, /\.md$/);

let loading: Promise<ProjectData[]> | null = null;

// Loaded once and shared
export const loadProjects = (): Promise<ProjectData[]> =>
{
  loading ??= loadMarkdownFiles(projectFiles).then((files) =>
    files
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((file) => ({
        title: textField(file, "title") || file.slug,
        subtitle: textField(file, "subtitle"),
        year: textField(file, "year"),
        category: textField(file, "category") || "Other",
        body: file.body,
      })),
  );
  return loading;
};

export const projectCategories = (projects: readonly ProjectData[]) =>
  categoriesInOrder(projects);

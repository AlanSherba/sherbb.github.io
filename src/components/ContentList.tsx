import ProjectListItem from "./projectsItem";

// A row in the left-hand table of contents. Both projects and blog posts
// are mapped to this shape so they share one list.
export interface ListEntry {
  key: string;
  title: string;
  subtitle: string;
  year: string;
  category: string;
}

interface ContentListProps {
  categories: readonly string[];
  entries: readonly ListEntry[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  emptyText?: string;
}

const ContentList = ({
  categories,
  entries,
  selectedKey,
  onSelect,
  emptyText,
}: ContentListProps) => (
  <nav className="min-h-0 flex-1 overflow-y-auto pb-16 pl-5 pr-8">
    {entries.length === 0 && emptyText && (
      <p className="select-none py-1 font-mono text-neutral-600">
        {emptyText}
      </p>
    )}
    {categories.map((category) =>
    {
      const inCategory = entries.filter((e) => e.category === category);
      if (inCategory.length === 0)
      {
        return null;
      }
      return (
        <div key={category} className="flex flex-col">
          <p className="select-none py-1 font-mono text-white opacity-15">
            {category}
          </p>
          {inCategory.map((entry) => (
            <ProjectListItem
              key={entry.key}
              title={entry.title}
              subtitle={entry.subtitle}
              year={entry.year}
              selected={entry.key === selectedKey}
              onClick={() => onSelect(entry.key)}
            />
          ))}
        </div>
      );
    })}
  </nav>
);

export default ContentList;

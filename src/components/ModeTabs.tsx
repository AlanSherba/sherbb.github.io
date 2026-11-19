export type SiteMode = "projects" | "blog";

// Each mode has its own color: solid with black text when active,
// a dim tint with colored text when not. Class strings are written out
// in full so Tailwind can find them.
const TABS: {
  mode: SiteMode;
  label: string;
  activeClass: string;
  inactiveClass: string;
}[] = [
  {
    mode: "projects",
    label: "Projects",
    activeClass: "bg-mode-projects text-black",
    inactiveClass:
      "bg-mode-projects/25 text-mode-projects hover:bg-mode-projects/40",
  },
  {
    mode: "blog",
    label: "Blog",
    activeClass: "bg-mode-blog text-black",
    inactiveClass: "bg-mode-blog/25 text-mode-blog hover:bg-mode-blog/40",
  },
];

interface ModeTabsProps {
  mode: SiteMode;
  onChange: (mode: SiteMode) => void;
}

const ModeTabs = ({ mode, onChange }: ModeTabsProps) => (
  <div className="pb-4 pl-5 pr-8">
    <div className="flex w-fit select-none font-mono text-xs font-bold">
      {TABS.map((tab) => (
        <button
          key={tab.mode}
          aria-pressed={tab.mode === mode}
          className={
            "px-4 py-1 " +
            (tab.mode === mode
              ? tab.activeClass + " cursor-default"
              : tab.inactiveClass)
          }
          onClick={() => onChange(tab.mode)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </div>
);

export default ModeTabs;

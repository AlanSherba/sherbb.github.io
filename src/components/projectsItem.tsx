interface ProjectListItemProps {
  title: string;
  subtitle: string;
  year: string;
  selected: boolean;
  onClick: () => void;
}

// Subtitle and year: dimmed grey, or dimmed accent on the selected row
const secondaryText = (selected: boolean) =>
  selected ? "text-accent/50" : "text-neutral-500";

const ProjectListItem = (props: ProjectListItemProps) => (
  <div
    className={
      "group relative flex cursor-pointer select-none gap-4 py-0.5 font-mono " +
      (props.selected ? "opacity-100" : "opacity-50 hover:opacity-100")
    }
    onClick={props.onClick}
  >
    {props.selected && (
      <div className="absolute left-[-1.25rem] top-1/2 h-2.5 w-2.5 -translate-y-1/2 bg-accent" />
    )}
    <p
      className={
        "whitespace-nowrap " +
        (props.selected
          ? "font-bold text-accent"
          : "text-white group-hover:underline group-hover:underline-offset-4")
      }
    >
      {props.title}
    </p>
    <p className={"hidden whitespace-nowrap lg:block " + secondaryText(props.selected)}>
      {props.subtitle}
    </p>
    <div className="flex-grow" />
    <p className={"hidden md:block " + secondaryText(props.selected)}>
      {props.year}
    </p>
  </div>
);

export default ProjectListItem;

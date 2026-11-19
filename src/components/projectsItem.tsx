interface ProjectListItemProps {
  title: string;
  year: string;
  selected: boolean;
  readers: number; // other people on this page; shown only when not selected
  onClick: () => void;
}

// Unselected rows are dimmed until hovered. The dimming is on the text, not
// the row, so the reader count beside it stays bright.
const dimmed = (selected: boolean) =>
  selected ? "" : "opacity-50 group-hover:opacity-100";

// Year: dimmed grey, or dimmed accent on the selected row
const secondaryText = (selected: boolean) =>
  selected ? "text-accent/50" : "text-neutral-500";

const ProjectListItem = (props: ProjectListItemProps) => (
  <div
    className="group relative flex cursor-pointer select-none gap-4 py-0.5 font-mono"
    onClick={props.onClick}
  >
    {props.selected && (
      <div className="absolute left-[-1.25rem] top-1/2 h-2.5 w-2.5 -translate-y-1/2 bg-accent" />
    )}
    {!props.selected && props.readers > 0 && (
      // Drawn by CSS so it's never selected or copied (like PageTitle's note)
      <p
        className="absolute right-full top-1/2 mr-2 -translate-y-1/2 select-none whitespace-nowrap text-xs text-green-500 before:content-[attr(data-label)]"
        data-label={`${props.readers} •`}
      />
    )}
    <p
      className={
        "min-w-0 truncate " +
        (props.selected
          ? "font-bold text-accent"
          : "text-white group-hover:underline group-hover:underline-offset-4 " +
            dimmed(false))
      }
    >
      {props.title}
    </p>
    <div className="flex-grow" />
    <p
      className={
        "hidden shrink-0 md:block " +
        secondaryText(props.selected) +
        " " +
        dimmed(props.selected)
      }
    >
      {props.year}
    </p>
  </div>
);

export default ProjectListItem;

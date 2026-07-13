interface ProjectListItemProps {
  title: string;
  subtitle: string;
  year: string;
  selected: boolean;
  onClick: () => void;
}

const ProjectListItem = (props: ProjectListItemProps) => (
  <div
    className={
      "group relative flex cursor-pointer select-none gap-4 py-0.5 font-mono " +
      (props.selected ? "opacity-100" : "opacity-70 hover:opacity-100")
    }
    onClick={props.onClick}
  >
    {props.selected && (
      <div className="absolute left-[-1.25rem] top-1/2 h-2.5 w-2.5 -translate-y-1/2 bg-white" />
    )}
    <p
      className={
        "whitespace-nowrap text-white " +
        (props.selected
          ? "font-bold"
          : "group-hover:underline group-hover:underline-offset-4")
      }
    >
      {props.title}
    </p>
    <p className="hidden whitespace-nowrap text-neutral-500 lg:block">
      {props.subtitle}
    </p>
    <div className="flex-grow" />
    <p className="hidden text-neutral-500 md:block">{props.year}</p>
  </div>
);

export default ProjectListItem;

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
      "hover group relative flex cursor-pointer select-none gap-2 " +
      (props.selected ? "opacity-100" : "opacity-30 hover:opacity-70")
    }
    onClick={props.onClick}
  >
    <p className="font-bold">{props.title}</p>
    <p className="font-light text-offwhite opacity-50">{props.subtitle}</p>
    <div className="flex-grow" />
    <p className="font-light text-offwhite opacity-50">{props.year}</p>
    <div
      className="
        absolute bottom-[2px] left-0 right-0 h-[1px] origin-left scale-x-0 animate-slideOut bg-offwhite group-hover:scale-x-100 group-hover:animate-slideIn"
    ></div>
    {props.selected && (
      <div className="absolute bottom-0 left-[-16px] top-0 m-auto h-1 w-1 rounded-xl bg-offwhite" />
    )}
  </div>
);

export default ProjectListItem;

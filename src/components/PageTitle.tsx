interface PageTitleProps {
  title: string;
  // Other people reading this page right now
  others?: number;
}

const PageTitle = ({ title, others = 0 }: PageTitleProps) => (
  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
    <h2 className="font-serif text-[3.5rem] leading-none text-white">
      {title}
    </h2>
    {others > 0 && (
      <p className="font-mono text-sm text-green-500">
        {others} {others === 1 ? "other" : "others"} reading right now
      </p>
    )}
  </div>
);

export default PageTitle;

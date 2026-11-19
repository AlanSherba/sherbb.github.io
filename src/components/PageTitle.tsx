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
      // The text is drawn by CSS (::before) rather than written into the
      // page, so it's never selected or copied, even with Select All
      <p
        className="select-none font-mono text-xs text-green-500 before:content-[attr(data-label)]"
        data-label={`${others} ${others === 1 ? "other" : "others"} reading right now`}
      />
    )}
  </div>
);

export default PageTitle;

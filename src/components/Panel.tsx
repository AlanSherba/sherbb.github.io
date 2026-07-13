interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Panel = ({ className, children, ...props }: PanelProps) => {
  return (
    <div
      className={`p-6 bg-black/30 backdrop-blur-[64px]${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Panel;

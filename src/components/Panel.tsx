interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Panel = ({ className, children, ...props }: PanelProps) => {
  return (
    <div
      className={`p-6 bg-black border-l border-l-[#333333]${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Panel;

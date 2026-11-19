import { RefObject } from "react";

// A message box for the chip panels, with a count of the characters left.
// Ctrl+Enter (Cmd+Enter on a Mac) submits.

interface MessageFieldProps {
  id: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
  onSubmit: () => void;
  fieldRef?: RefObject<HTMLTextAreaElement>;
}

const MessageField = ({ id, value, maxLength, onChange, onSubmit, fieldRef }: MessageFieldProps) => (
  <div className="relative flex">
    <textarea
      ref={fieldRef}
      className="h-28 flex-1 resize-none bg-white/15 px-3 pb-6 pt-2 font-mono text-base text-white outline-none placeholder:text-white/60 focus:bg-white/20"
      placeholder="Message..."
      maxLength={maxLength}
      aria-describedby={`${id}-count`}
      value={value}
      onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
      onKeyDown={(event) =>
      {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey))
        {
          event.preventDefault();
          onSubmit();
        }
      }}
    />
    {/* Characters used of the limit; full strength once it's reached */}
    <p
      id={`${id}-count`}
      className={`pointer-events-none absolute bottom-1.5 right-3 select-none font-mono text-xs ${value.length >= maxLength ? "font-bold text-white" : "text-white/60"}`}
    >
      {value.length}/{maxLength}
    </p>
  </div>
);

export default MessageField;

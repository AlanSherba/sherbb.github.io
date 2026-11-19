import ReactMarkdown, { Components, ExtraProps } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { isVideoPath, resolveMediaUrl } from "../MarkdownFiles";

// True when a paragraph holds nothing but a single link
const isLinkOnly = (node: ExtraProps["node"]): boolean =>
{
  const children = (node?.children ?? []).filter(
    (child) => !(child.type === "text" && child.value.trim() === ""),
  );
  return (
    children.length === 1 &&
    children[0].type === "element" &&
    children[0].tagName === "a"
  );
};

// Body text uses translucent color rather than opacity, so links and bold
// text inside a paragraph can be brighter than the text around them.
const BODY = "font-mono leading-relaxed text-white/30";
const LIST = BODY + " flex flex-col gap-1 marker:text-white/20";

const components: Components = {
  h1: ({ children }) => (
    <h2 className="pt-6 font-serif text-[2.5rem] leading-none text-white">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="pt-6 font-serif text-4xl leading-none text-white">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="pt-4 font-serif text-2xl leading-none text-white">
      {children}
    </h4>
  ),
  h4: ({ children }) => (
    <h5 className="pt-2 font-mono font-bold text-white/50">{children}</h5>
  ),
  h5: ({ children }) => (
    <h6 className="pt-2 font-mono font-bold text-white/50">{children}</h6>
  ),
  h6: ({ children }) => (
    <h6 className="pt-2 font-mono font-bold text-white/50">{children}</h6>
  ),
  // A link on a line of its own is a call to action (like "Available on
  // Steam"): larger serif text instead of inline body text.
  p: ({ node, children }) =>
    isLinkOnly(node) ? (
      <p className="w-fit font-serif text-xl">{children}</p>
    ) : (
      <p className={BODY}>{children}</p>
    ),
  a: ({ href, children }) =>
  {
    const external = !!href && /^https?:/i.test(href);
    return (
      <a
        className="text-accent/70 underline-offset-4 hover:text-accent hover:underline"
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => (
    <strong className="font-bold text-white/60">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="text-white/20">{children}</del>,
  ul: ({ children }) => (
    <ul className={LIST + " list-disc pl-6"}>{children}</ul>
  ),
  // Wider indent so numbers like "10." fit beside the text
  ol: ({ children }) => (
    <ol className={LIST + " list-decimal pl-[4ch]"}>{children}</ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="flex flex-col gap-4 border-l-2 border-accent/50 pl-5">
      {children}
    </blockquote>
  ),
  // Fenced blocks with a language arrive with highlight classes (hljs,
  // language-rust); keep those. Plain inline code gets a faint chip.
  code: ({ className, children }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="bg-white/5 px-1 py-0.5 font-mono text-[0.9em] text-white/50">
        {children}
      </code>
    ),
  pre: ({ children }) => (
    <pre className="overflow-x-auto bg-white/5 p-4 font-mono text-sm leading-relaxed text-white/50 [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-[1em]">
      {children}
    </pre>
  ),
  hr: () => <hr className="border-white/10" />,
  img: ({ src, alt }) =>
  {
    const url = resolveMediaUrl(src);
    return isVideoPath(url) ? (
      <video
        className="box-border block h-fit w-full"
        src={url}
        autoPlay
        muted
        loop
        playsInline
      />
    ) : (
      <img
        className="box-border block h-fit w-full"
        src={url}
        alt={alt ?? ""}
        loading="lazy"
      />
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-sm text-white/30">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-white/15 px-3 py-2 text-left font-bold text-white/50">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-white/5 px-3 py-2">{children}</td>
  ),
};

const Markdown = ({ children }: { children: string }) => (
  <div className="flex flex-col gap-6">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={components}
    >
      {children}
    </ReactMarkdown>
  </div>
);

export default Markdown;

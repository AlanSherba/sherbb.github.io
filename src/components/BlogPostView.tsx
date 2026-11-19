import { BlogPost, formatPostDate } from "../BlogPosts";
import Markdown from "./Markdown";

const BlogPostView = ({ post }: { post: BlogPost }) => (
  <article className="flex max-w-3xl flex-col gap-6">
    <header className="flex flex-col gap-4">
      <h2 className="font-serif text-[3.5rem] leading-none text-white">
        {post.title}
      </h2>
      {post.date && (
        <p className="font-mono text-sm text-neutral-600">
          {formatPostDate(post.date)}
        </p>
      )}
    </header>
    <Markdown>{post.body}</Markdown>
  </article>
);

export default BlogPostView;

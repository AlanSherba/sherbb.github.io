import { BlogPost, formatPostDate } from "../BlogPosts";
import Markdown from "./Markdown";
import PageTitle from "./PageTitle";

interface BlogPostViewProps {
  post: BlogPost;
  others?: number; // other people reading this post
}

const BlogPostView = ({ post, others }: BlogPostViewProps) => (
  <article className="flex max-w-3xl flex-col gap-6">
    <header className="flex flex-col gap-4">
      <PageTitle title={post.title} others={others} />
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

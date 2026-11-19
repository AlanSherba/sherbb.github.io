import React, { useEffect, useMemo, useRef, useState } from "react";
import { BlogPost, blogCategories, loadBlogPosts } from "./BlogPosts";
import BlogPostView from "./components/BlogPostView";
import ContentList, { ListEntry } from "./components/ContentList";
import Markdown from "./components/Markdown";
import ModeTabs, { SiteMode } from "./components/ModeTabs";
import
{
  isVideoPath,
  markdownMediaPaths,
  resolveMediaUrl,
} from "./MarkdownFiles";
import { ProjectData, loadProjects, projectCategories } from "./Projects";

import { useSearchParams } from "react-router-dom";

const prefetchedImages: HTMLImageElement[] = [];

// Pre-fetch all project media so project switching feels instant
const prefetchProjectMedia = (projects: readonly ProjectData[]) =>
{
  projects.forEach((project) =>
  {
    markdownMediaPaths(project.body).forEach((mediaPath) =>
    {
      const url = resolveMediaUrl(mediaPath);
      if (isVideoPath(mediaPath))
      {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "video";
        link.href = url;
        document.head.appendChild(link);
      }
      else
      {
        const img = new Image();
        img.src = url;
        prefetchedImages.push(img);
      }
    });
  });
};

function App()
{
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: SiteMode = searchParams.get("tab") === "blog" ? "blog" : "projects";

  // Projects and blog posts load once in the background; null until they arrive
  const [projects, setProjects] = useState<ProjectData[] | null>(null);
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  useEffect(() =>
  {
    loadProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
    loadBlogPosts()
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);

  // Once projects are known and the page has loaded, fetch their media
  useEffect(() =>
  {
    if (!projects)
    {
      return;
    }
    const prefetch = () => prefetchProjectMedia(projects);
    if (document.readyState === "complete")
    {
      prefetch();
      return;
    }
    window.addEventListener("load", prefetch);
    return () => window.removeEventListener("load", prefetch);
  }, [projects]);

  const projectEntries: ListEntry[] = useMemo(
    () =>
      (projects ?? []).map((project) => ({
        key: project.title,
        title: project.title,
        subtitle: project.subtitle,
        year: project.year,
        category: project.category,
      })),
    [projects],
  );

  const postEntries: ListEntry[] = useMemo(
    () =>
      (posts ?? []).map((post) => ({
        key: post.slug,
        title: post.title,
        subtitle: post.subtitle,
        year: post.date.slice(0, 4),
        category: post.category,
      })),
    [posts],
  );

  // Storing the page state in URL params lets you share a link to a project
  // or post and use browser BACK between them.
  // The project in the URL, or the first one
  const projectParam = searchParams.get("project");
  const selectedProject =
    projects?.find((project) => project.title === projectParam) ??
    projects?.[0];

  // The post in the URL, or the newest one
  const postParam = searchParams.get("post");
  const selectedPost =
    posts?.find((post) => post.slug === postParam) ?? posts?.[0];

  // Remember the last project and post viewed, to return to them when
  // switching tabs
  const lastProjectTitle = useRef<string | null>(null);
  const lastPostSlug = useRef<string | null>(null);
  useEffect(() =>
  {
    if (mode === "projects" && selectedProject)
    {
      lastProjectTitle.current = selectedProject.title;
    }
    if (mode === "blog" && selectedPost)
    {
      lastPostSlug.current = selectedPost.slug;
    }
  }, [mode, selectedProject, selectedPost]);

  const [contactOpen, setContactOpen] = useState(false);
  const descriptionRef = useRef<HTMLElement>(null);

  // Reset the content scroll position when switching projects or posts
  useEffect(() =>
  {
    descriptionRef.current?.scrollTo(0, 0);
  }, [selectedProject?.title, selectedPost?.slug, mode]);

  const setMode = (newMode: SiteMode) =>
  {
    if (newMode === mode)
    {
      return;
    }
    if (newMode === "blog")
    {
      setSearchParams(
        lastPostSlug.current
          ? { tab: "blog", post: lastPostSlug.current }
          : { tab: "blog" },
      );
      return;
    }
    setSearchParams(
      lastProjectTitle.current ? { project: lastProjectTitle.current } : {},
    );
  };

  const setPost = (slug: string) =>
  {
    if (slug === selectedPost?.slug)
    {
      return;
    }
    setSearchParams({ tab: "blog", post: slug });
  };

  const setProject = (projectTitle: string) =>
  {
    if (projectTitle === selectedProject?.title)
    {
      return;
    }
    setSearchParams({ project: projectTitle });
  };

  const Header = () =>
  {
    return (
      <header className="mx-auto flex w-full max-w-[1264px] flex-row items-baseline gap-8 pb-6 pl-[5.25rem] pr-16 pt-12">
        <h1 className="whitespace-nowrap font-serif text-4xl italic text-white">
          Alan Sherba
        </h1>
        {/* Roles */}
        <p className="min-w-0 flex-1 self-center truncate font-mono text-sm tracking-wider text-neutral-500">
          Creative Director, Engineer, Designer, Artist, Gaming Enthusiast
        </p>

        {/* Contact dropdown */}
        <div className="relative self-center">
          <button
            aria-label="Contact"
            aria-expanded={contactOpen}
            className="flex h-6 w-6 items-center justify-center bg-accent font-mono text-xs font-extrabold leading-none text-black hover:opacity-80"
            onClick={() => setContactOpen(!contactOpen)}
          >
            @
          </button>
          {contactOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setContactOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2.5 flex flex-col items-start gap-0.5 whitespace-nowrap bg-accent px-3 py-2.5 font-mono text-base text-white">
                <a
                  className="select-text underline-offset-4 hover:underline"
                  href="mailto:hello@less3.design"
                >
                  hello@less3.design
                </a>
                <a
                  className="underline-offset-4 hover:underline"
                  href="https://twitter.com/AlanSherba"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Twitter
                </a>
                <a
                  className="underline-offset-4 hover:underline"
                  href="https://www.linkedin.com/in/alan-sherba-365784141/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
              </div>
            </>
          )}
        </div>
      </header>
    );
  };

  const Sidebar = () =>
  {
    return (
      <div className="flex min-h-0 w-72 shrink-0 flex-col">
        <ModeTabs mode={mode} onChange={setMode} />
        {mode === "projects" ? (
          <ContentList
            categories={projectCategories(projects ?? [])}
            entries={projectEntries}
            selectedKey={selectedProject?.title}
            onSelect={setProject}
          />
        ) : (
          <ContentList
            categories={blogCategories(posts ?? [])}
            entries={postEntries}
            selectedKey={selectedPost?.slug}
            onSelect={setPost}
            emptyText={posts ? "No posts yet" : undefined}
          />
        )}
      </div>
    );
  };

  const Blog = () =>
  {
    return (
      <main ref={descriptionRef} className="flex-1 overflow-y-auto pb-16 pr-12">
        {selectedPost ? (
          <BlogPostView post={selectedPost} />
        ) : (
          posts && (
            <div className="flex max-w-3xl flex-col gap-6">
              <h2 className="font-serif text-[3.5rem] leading-none text-white">
                Blog
              </h2>
              <p className="font-mono leading-relaxed text-white opacity-30">
                Nothing here
              </p>
            </div>
          )
        )}
      </main>
    );
  };

  const Description = () =>
  {
    if (!selectedProject)
    {
      return <main className="flex-1" />;
    }
    return (
      <main ref={descriptionRef} className="flex-1 overflow-y-auto pb-16 pr-12">
        <div className="flex max-w-3xl flex-col gap-6">
          <h2 className="font-serif text-[3.5rem] leading-none text-white">
            {selectedProject.title}
          </h2>
          <Markdown>{selectedProject.body}</Markdown>
        </div>
      </main>
    );
  };

  return (
    <div
      data-mode={mode}
      className="absolute inset-0 flex flex-col overflow-hidden bg-black font-mono text-white"
    >
      {Header()}
      <div className="mx-auto flex min-h-0 w-full max-w-[1264px] flex-1 flex-row gap-8 px-16">
        {Sidebar()}
        {mode === "projects" ? Description() : Blog()}
      </div>
    </div>
  );
}

export default App;

import React, { useEffect, useMemo, useRef, useState } from "react";
import { BlogPost, blogCategories, loadBlogPosts } from "./BlogPosts";
import BlogPostView from "./components/BlogPostView";
import ContentList, { ListEntry } from "./components/ContentList";
import ModeTabs, { SiteMode } from "./components/ModeTabs";
import
{
  ProjectCategories,
  ProjectData,
  ProjectDatabase,
} from "./ProjectsDatabase";

import { useSearchParams } from "react-router-dom";

const prefetchedImages: HTMLImageElement[] = [];

const projectEntries: ListEntry[] = ProjectDatabase.map((project) => ({
  key: project.title,
  title: project.title,
  subtitle: project.subtitle,
  year: project.year,
  category: project.category,
}));

function App()
{
  const [searchParams, setSearchParams] = useSearchParams();
  const mode: SiteMode = searchParams.get("tab") === "blog" ? "blog" : "projects";

  // Pre-fetch all project media after page load so project switching feels instant
  useEffect(() => {
    const prefetch = () => {
      ProjectDatabase.forEach((project) => {
        project.media.forEach((mediaPath) => {
          const url = process.env.PUBLIC_URL + "/images/" + mediaPath;
          if (mediaPath.toLowerCase().endsWith(".mp4")) {
            const link = document.createElement("link");
            link.rel = "prefetch";
            link.as = "video";
            link.href = url;
            document.head.appendChild(link);
          } else {
            const img = new Image();
            img.src = url;
            prefetchedImages.push(img);
          }
        });
      });
    };

    if (document.readyState === "complete") {
      prefetch();
    } else {
      window.addEventListener("load", prefetch);
      return () => window.removeEventListener("load", prefetch);
    }
  }, []);

  const initProject = () =>
  {
    for (let i = 0; i < ProjectDatabase.length; i++)
    {
      if (searchParams.get("project") === ProjectDatabase[i].title)
      {
        return ProjectDatabase[i];
      }
    }
    return ProjectDatabase[0];
  };

  // Storing the page state in URL param lets you share a link to a project
  // and use browser BACK between projects.
  useEffect(() =>
  {
    // Keep the last viewed project while on another tab
    if (searchParams.get("tab") === "blog")
    {
      return;
    }
    for (let i = 0; i < ProjectDatabase.length; i++)
    {
      if (searchParams.get("project") === ProjectDatabase[i].title)
      {
        setSelectedProject(ProjectDatabase[i]);
        return;
      }
    }
    setSelectedProject(ProjectDatabase[0]);
  }, [searchParams]);

  const [selectedProject, setSelectedProject] =
    useState<ProjectData>(initProject());

  // Blog posts load once in the background; null until they arrive
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  useEffect(() =>
  {
    loadBlogPosts()
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);

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

  // The post in the URL, or the newest one
  const postParam = searchParams.get("post");
  const selectedPost =
    posts?.find((post) => post.slug === postParam) ?? posts?.[0];

  // Remember the last post read, to return to it from the Projects tab
  const lastPostSlug = useRef<string | null>(null);
  useEffect(() =>
  {
    if (mode === "blog" && selectedPost)
    {
      lastPostSlug.current = selectedPost.slug;
    }
  }, [mode, selectedPost]);

  const [contactOpen, setContactOpen] = useState(false);
  const descriptionRef = useRef<HTMLElement>(null);

  // Reset the content scroll position when switching projects or posts
  useEffect(() =>
  {
    descriptionRef.current?.scrollTo(0, 0);
  }, [selectedProject, selectedPost?.slug, mode]);

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
    setSearchParams({ project: selectedProject.title });
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
    if (projectTitle === selectedProject.title)
    {
      return;
    }
    for (let i = 0; i < ProjectDatabase.length; i++)
    {
      if (ProjectDatabase[i].title === projectTitle)
      {
        setSearchParams({ project: ProjectDatabase[i].title });
        return;
      }
    }
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
            categories={ProjectCategories}
            entries={projectEntries}
            selectedKey={selectedProject.title}
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
    return (
      <main ref={descriptionRef} className="flex-1 overflow-y-auto pb-16 pr-12">
        <div className="flex max-w-3xl flex-col gap-6">
          <h2 className="font-serif text-[3.5rem] leading-none text-white">
            {selectedProject.title}
          </h2>
          <p className="whitespace-pre-line font-mono leading-relaxed text-white opacity-30">
            {selectedProject.description}
          </p>
          {selectedProject.link && selectedProject.linkText && (
            <a
              className="w-fit font-serif text-xl text-accent underline-offset-2 opacity-70 hover:underline hover:opacity-100"
              target="_blank"
              rel="noopener noreferrer"
              href={selectedProject.link}
            >
              {selectedProject.linkText}
            </a>
          )}

          <div className="flex flex-col gap-6 pt-4">
            {/* Projects with only a hero icon show it; others show their gallery */}
            {(selectedProject.media.length > 1
              ? selectedProject.media.slice(1)
              : selectedProject.media
            ).map((mediaString) =>
            {
              const lowerMediaString = mediaString.toLowerCase();
              const isVideo =
                lowerMediaString.endsWith(".mp4") ||
                lowerMediaString.endsWith(".webm");
              const mediaUrl =
                process.env.PUBLIC_URL + "/images/" + mediaString;
              return isVideo ? (
                <video
                  key={mediaString}
                  className="box-border h-fit w-full"
                  src={mediaUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  key={mediaString}
                  className="box-border h-fit w-full"
                  src={mediaUrl}
                  alt=""
                />
              );
            })}
          </div>
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

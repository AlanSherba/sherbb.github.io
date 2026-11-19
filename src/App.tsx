import React, { useEffect, useRef, useState } from "react";
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

  const [contactOpen, setContactOpen] = useState(false);
  const descriptionRef = useRef<HTMLElement>(null);

  // Reset the description scroll position when switching projects
  useEffect(() =>
  {
    descriptionRef.current?.scrollTo(0, 0);
  }, [selectedProject]);

  const setMode = (newMode: SiteMode) =>
  {
    if (newMode === mode)
    {
      return;
    }
    setSearchParams(
      newMode === "blog" ? { tab: "blog" } : { project: selectedProject.title },
    );
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
      <header className="mx-auto flex w-full max-w-[1500px] flex-row items-baseline gap-8 pb-6 pl-[5.25rem] pr-16 pt-12">
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
      <div className="flex min-h-0 w-[42%] max-w-2xl flex-col">
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
            categories={[]}
            entries={[]}
            onSelect={() => {}}
            emptyText="No posts yet"
          />
        )}
      </div>
    );
  };

  const BlogPlaceholder = () =>
  {
    return (
      <main className="flex-1 overflow-y-auto pb-16 pr-12">
        <div className="flex max-w-3xl flex-col gap-6">
          <h2 className="font-serif text-[3.5rem] leading-none text-white">Blog</h2>
          <p className="font-mono leading-relaxed text-white opacity-30">
            Nothing here
          </p>
        </div>
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
      <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-row gap-8 px-16">
        {Sidebar()}
        {mode === "projects" ? Description() : BlogPlaceholder()}
      </div>
    </div>
  );
}

export default App;

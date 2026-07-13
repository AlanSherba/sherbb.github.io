import React, { useEffect, useRef, useState } from "react";
import ProjectListItem from "./components/projectsItem";
import
{
  ProjectCategories,
  ProjectData,
  ProjectDatabase,
} from "./ProjectsDatabase";

import { useSearchParams } from "react-router-dom";

const prefetchedImages: HTMLImageElement[] = [];

function App()
{
  const [searchParams, setSearchParams] = useSearchParams();

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
      <header className="mx-auto flex w-full max-w-[1500px] flex-row items-baseline gap-8 pb-10 pl-[5.25rem] pr-16 pt-12">
        <h1 className="whitespace-nowrap font-serif text-4xl italic text-white">
          Alan Sherba
        </h1>
        {/* Looping marquee of roles, scrolling left to right */}
        <div className="min-w-0 flex-1 self-center overflow-hidden">
          <div className="flex w-max animate-marquee select-none font-mono text-sm tracking-wider text-neutral-500">
            {[0, 1].map((half) => (
              <span key={half} className="whitespace-pre">
                {"Creative Director - Engineer - Designer - Artist - Gaming Enthusiast - ".repeat(6)}
              </span>
            ))}
          </div>
        </div>

        {/* Contact dropdown */}
        <div className="relative">
          <button
            className="font-serif text-3xl italic text-accent hover:underline"
            onClick={() => setContactOpen(!contactOpen)}
          >
            Contact
          </button>
          {contactOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setContactOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 flex flex-col items-end gap-2 bg-black py-3 font-mono text-sm">
                <a
                  className="select-text text-accent hover:underline"
                  href="mailto:hello@less3.design"
                >
                  hello@less3.design
                </a>
                <a
                  className="text-accent hover:underline"
                  href="https://twitter.com/AlanSherba"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Twitter
                </a>
                <a
                  className="text-accent hover:underline"
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

  const List = () =>
  {
    return (
      <nav className="w-[42%] max-w-2xl overflow-y-auto pb-16 pl-5 pr-8">
        {ProjectCategories.map((category) => (
          <div key={category} className="flex flex-col">
            <p className="select-none py-1 font-mono text-neutral-600">
              {category}
            </p>
            {ProjectDatabase.filter((p) => p.category === category).map(
              (project) => (
                <ProjectListItem
                  key={project.title}
                  title={project.title}
                  subtitle={project.subtitle}
                  year={project.year}
                  selected={project.title === selectedProject.title}
                  onClick={() => setProject(project.title)}
                />
              ),
            )}
          </div>
        ))}
      </nav>
    );
  };

  const Description = () =>
  {
    return (
      <main ref={descriptionRef} className="flex-1 overflow-y-auto pb-16 pr-12">
        <div className="flex max-w-3xl flex-col gap-6">
          <h2 className="font-serif text-5xl text-white">
            {selectedProject.title}
          </h2>
          <p className="whitespace-pre-line font-mono leading-relaxed text-white opacity-70">
            {selectedProject.description}
          </p>
          {selectedProject.link && selectedProject.linkText && (
            <a
              className="w-fit font-serif text-xl text-accent underline underline-offset-2"
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
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-black font-mono text-white">
      {Header()}
      <div className="mx-auto flex min-h-0 w-full max-w-[1500px] flex-1 flex-row gap-8 px-16">
        {List()}
        {Description()}
      </div>
    </div>
  );
}

export default App;

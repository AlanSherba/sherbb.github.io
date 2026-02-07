import React, { useEffect, useState } from "react";
import ProjectListItem from "./components/projectsItem";
import
{
  ProjectCategories,
  ProjectData,
  ProjectDatabase,
} from "./ProjectsDatabase";

import { useSearchParams } from "react-router-dom";
import ProfileCard from "./components/profileCard";
import Panel from "./components/Panel";
import useTilt from "./hooks/useTilt";

const prefetchedImages: HTMLImageElement[] = [];

function App()
{
  const tiltRef = useTilt({ includePerspective: false });
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

  // Ummm.... basically storying the page stat in URL param. This lets you BACK out of gallery.
  // And lets you share a link to a project and gallery view
  useEffect(() =>
  {
    if (searchParams.get("project") !== selectedProject.title)
    {
      //close gallery on back.
      setShowGallery(false);
    }

    setShowGallery(searchParams.get("view") === "gallery");
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

  const [newProjectAnimation, setNewProjectAnimation] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

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
        //setSelectedProject(ProjectDatabase[i]);
        setNewProjectAnimation(true);
        setSearchParams({ project: ProjectDatabase[i].title });
        return;
      }
    }
  };

  const Hero = () =>
  {
    return (
      <div
        className="flex flex-col gap-12 items-center justify-center"
        style={{
          width: "400px",
          minWidth: "400px",
          maxWidth: "400px",
          flexShrink: 0,
        }}
      >
        <div className="self-start">
          <ProfileCard background />
        </div>

        {/* Project Hero */}
        <Panel className="relative aspect-square select-none">
          {selectedProject.media.length > 0 && (
            <>
              <div
                style={{
                  width: "351.3px",
                  height: "351.3px",
                  minWidth: "351.3px",
                  minHeight: "351.3px",
                  maxWidth: "351.3px",
                  maxHeight: "351.3px",
                  position: "relative",
                }}
                className="mx-auto"
              >
                <img
                  className={
                    "aspect-square object-cover"
                  }
                  src={
                    process.env.PUBLIC_URL +
                    "/images/" +
                    selectedProject.media[0]
                  }
                />
              </div>
            </>
          )}
        </Panel>

        {/* Contact card */}
        <Panel className="flex flex-col gap-1 w-fit self-start">
          <p className="text-2xl font-light text-left">Contact</p>
          <a
            className="select-text text-sm font-light text-right text-[#71BBFF] hover:underline"
            href="mailto:hello@less3.design"
          >
            hello@less3.design
          </a>
          <div className="flex flex-row gap-2">
            <a
              className="select-text text-sm font-light text-right text-[#71BBFF] hover:underline"
              href="https://twitter.com/AlanSherba"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitter
            </a>
            <a
              className="select-text text-sm font-light text-right text-[#71BBFF] hover:underline"
              href="https://www.linkedin.com/in/alan-sherba-365784141/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </div>
        </Panel>
      </div>
    );
  };

  const Description = () =>
  {
    return (
      <Panel
        className={
          "flex flex-col gap-4 mx-auto overflow-auto"
        }
        style={{
          maxWidth: "600px",
          maxHeight: "60vh",
          alignSelf: "center",
          minHeight: 0,
        }}
        onAnimationEnd={() => setNewProjectAnimation(false)}
      >
        <div className="flex flex-col gap-4 p-0 m-0">
          <span className="relative text-4xl font-light block">
            {selectedProject.title}
            <div className="absolute bottom-0 left-[-40px] top-0 m-auto h-[3px] w-4 rounded bg-offwhite"></div>
          </span>
          <p className="whitespace-pre-line">{selectedProject.description}</p>
          {selectedProject.link && selectedProject.linkText && (
            <a
              className="text-[#71BBFF] hover:underline"
              target="_blank"
              href={selectedProject.link}
            >
              {selectedProject.linkText}
            </a>
          )}

          <div className="flex flex-col gap-4">
            {selectedProject.media.slice(1).map((mediaString, index) =>
            {
              const lowerMediaString = mediaString.toLowerCase();
              const isVideo = lowerMediaString.endsWith(".mp4") || lowerMediaString.endsWith(".webm");
              const mediaUrl = process.env.PUBLIC_URL + "/images/" + mediaString;
              return isVideo ? (
                <video
                  key={mediaString}
                  className="object-fit box-border h-fit w-full"
                  src={mediaUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  key={mediaString}
                  className="object-fit box-border h-fit w-full"
                  src={mediaUrl}
                  alt=""
                />
              );
            })}
          </div>
        </div>
      </Panel>
    );
  };

  const List = () =>
  {
    return (
      <Panel
        className="flex flex-col items-left justify-center"
        style={{ width: "400px", minWidth: "400px", maxWidth: "400px", height: "fit-content", alignSelf: "center" }}
      >
        <text className="relative select-none text-4xl font-light">
          Projects
        </text>
        <div className="h-4" />

        {/* Projects list */}
        {ProjectCategories.map((category) => (
          <>
            <text className="relative select-none font-light opacity-30">
              {category}
            </text>
            {ProjectDatabase.map((project) =>
            {
              return project.category == category ? (
                <ProjectListItem
                  key={project.title + category}
                  title={project.title}
                  subtitle={project.subtitle}
                  year={project.year}
                  selected={project.title === selectedProject.title}
                  onClick={() =>
                  {
                    setProject(project.title);
                  }}
                />
              ) : (
                <></>
              );
            })}
            {
              // Only add divider if there is more in this category
              ProjectDatabase.filter(p => p.category == category).length > 1 && <div className="h-4" />
            }
          </>
        ))}
      </Panel>
    );
  };

  const BodySection = () =>
  {
    return (
      <div
        className="flex flex-row gap-12"
        style={{
          transformStyle: "preserve-3d",
        }}
      >
        {Hero()}
        {List()}
        {Description()}
      </div>
    );
  };

  return (
    <div style={{ perspective: "800px", position: "absolute", inset: 0, overflow: "hidden" }}>
      <div ref={tiltRef} style={{ transformStyle: "preserve-3d", width: "100%", height: "100%" }}>
        {/* BG Layer 1 — static dots */}
        <div
          className="pointer-events-none absolute h-[400%] w-[400%]"
          style={{
            top: "-150%",
            left: "-150%",
            backgroundImage: `url(${process.env.PUBLIC_URL}/images/bg_dots.png)`,
            backgroundRepeat: "repeat",
            backgroundColor: "black",
            opacity: .1,
            transform: "translateZ(-00px)",
          }}
        />
        <div
          className="pointer-events-none absolute h-[400%] w-[400%]"
          style={{
            top: "-150%",
            left: "-150%",
            backgroundImage: `url(${process.env.PUBLIC_URL}/images/bg_dots.png)`,
            backgroundRepeat: "repeat",
            backgroundColor: "black",
            opacity: .2,
            transform: "translateZ(-200px)",
          }}
        />
        <div
          className="pointer-events-none absolute h-[400%] w-[400%]"
          style={{
            top: "-150%",
            left: "-150%",
            backgroundImage: `url(${process.env.PUBLIC_URL}/images/bg_dots.png)`,
            backgroundRepeat: "repeat",
            backgroundColor: "black",
            opacity: .3,
            transform: "translateZ(-400px)",
          }}
        />
        <div
          className="pointer-events-none absolute h-[400%] w-[400%]"
          style={{
            top: "-150%",
            left: "-150%",
            backgroundImage: `url(${process.env.PUBLIC_URL}/images/bg_dots.png)`,
            backgroundRepeat: "repeat",
            backgroundColor: "black",
            opacity: .4,
            transform: "translateZ(-800px)",
          }}
        />

        {/* Content layer */}
        <div
          className="absolute inset-0 flex flex-row gap-8 justify-center p-16 h-full w-full"
          style={{ transform: "translateZ(50px)" }}
        >
          <div className="flex flex-row gap-8 justify-center overflow-clip h-full w-full">
            {BodySection()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

import React, { useEffect, useState } from "react";
import ProjectListItem from "./components/projectsItem";
import {
  ProjectCategories,
  ProjectData,
  ProjectDatabase,
} from "./ProjectsDatabase";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

import { useSearchParams } from "react-router-dom";
import ProfileCard from "./components/profileCard";

function App() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initProject = () => {
    for (let i = 0; i < ProjectDatabase.length; i++) {
      if (searchParams.get("project") === ProjectDatabase[i].title) {
        return ProjectDatabase[i];
      }
    }
    return ProjectDatabase[0];
  };

  // Ummm.... basically storying the page stat in URL param. This lets you BACK our of gallery.
  // And lets you share a link to a project and gallery view
  useEffect(() => {
    if (searchParams.get("project") !== selectedProject.title) {
      //close gallery on back.
      setShowGallery(false);
    }

    setShowGallery(searchParams.get("view") === "gallery");
    for (let i = 0; i < ProjectDatabase.length; i++) {
      if (searchParams.get("project") === ProjectDatabase[i].title) {
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

  const setProject = (projectTitle: string) => {
    if (projectTitle === selectedProject.title) {
      return;
    }
    for (let i = 0; i < ProjectDatabase.length; i++) {
      if (ProjectDatabase[i].title === projectTitle) {
        //setSelectedProject(ProjectDatabase[i]);
        setNewProjectAnimation(true);
        setSearchParams({ project: ProjectDatabase[i].title });
        return;
      }
    }
  };

  const MainPage = () => {
    return (
      <>
        <div className="flex w-[512px] animate-fadeInFast flex-col gap-4">
          <ProfileCard background />

          {/* Media Gallery */}
          <div className="relative min-h-0 flex-grow select-none rounded-[32px] bg-offwhite/[0.03] pr-4">
            {/* Inside border without messing with box */}
            <div className="absolute bottom-0 left-0 right-0 top-0 rounded-[32px] border border-offwhite/[0.05]" />
            {selectedProject.media.length > 0 && (
              <>
                <div className="relative h-full w-full rounded-[32px] bg-offwhite/[0.03] pr-4">
                  {/* Inside border without messing with box */}
                  <div className="absolute bottom-0 left-0 right-0 top-0 rounded-[32px] border border-offwhite/[0.05]" />
                  <img
                    className={
                      "box-border h-full w-full rounded-[32px] border border-offwhite/[0.05] object-cover" +
                      (newProjectAnimation ? " animate-galleryHeroSlideIn" : "")
                    }
                    src={
                      process.env.PUBLIC_URL +
                      "/images/" +
                      selectedProject.media[0]
                    }
                    key={selectedProject.media[0]}
                  />
                  {/* Inside border without messing with box. This ones positioned well so we use it as the IMG container div*/}
                  <div className="absolute bottom-0 left-0 right-[16px] top-0 flex justify-end rounded-[32px] border border-offwhite/[0.05] p-4">
                    {/* Gallery Button */}
                    {selectedProject.media.length > 1 && (
                      <button
                        className="flex h-min animate-fadeInFast flex-row gap-4 rounded-[25px] bg-black/50 pb-4 pl-8 pr-8 pt-4 shadow-xl drop-shadow-closeButton backdrop-blur-xl hover:bg-offwhite hover:text-black"
                        onClick={() =>
                          setSearchParams({
                            project: selectedProject.title,
                            view: "gallery",
                          })
                        }
                      >
                        <p>Gallery</p>
                        <FullscreenIcon />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="h-full w-[2px] animate-fadeInFast bg-[#30302B4D]" />

        {/* List section */}

        <div className="flex w-[512px] animate-fadeInFast flex-col pb-8 pt-8">
          <text className="relative select-none text-4xl font-light">
            Projects
            <div className="absolute bottom-0 left-[-40px] top-0 m-auto h-[3px] w-4 rounded bg-offwhite"></div>
          </text>
          <div className="h-4" />

          {/* Projects list */}
          {ProjectCategories.map((category) => (
            <>
              <text className="relative select-none font-light opacity-30">
                {category}
              </text>
              {ProjectDatabase.map((project) => {
                return project.category == category ? (
                  <ProjectListItem
                    key={project.title + category}
                    title={project.title}
                    subtitle={project.subtitle}
                    year={project.year}
                    selected={project.title === selectedProject.title}
                    onClick={() => {
                      setProject(project.title);
                    }}
                  />
                ) : (
                  <></>
                );
              })}
              <div className="h-3" />
            </>
          ))}

          <div className="flex-grow" />
          {/* Project Description */}
          <div
            className={
              "flex flex-col gap-4 " +
              (newProjectAnimation ? "animate-descriptionSlideIn" : "")
            }
            onAnimationEnd={() => setNewProjectAnimation(false)}
          >
            <text className="relative text-4xl font-light">
              {selectedProject.title}
              <div className="absolute bottom-0 left-[-40px] top-0 m-auto h-[3px] w-4 rounded bg-offwhite"></div>
            </text>
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
          </div>
        </div>
      </>
    );
  };

  const Gallery = () => {
    return (
      <div className="relative flex h-full w-[1090px] animate-fadeInFast">
        <div className="flex flex-col gap-4 overflow-auto pr-8">
          {selectedProject.media.slice(1).map((mediaString, index) => (
            <img
              key={mediaString}
              className="object-fit box-border h-fit w-full rounded-[32px] border border-offwhite/[0.05]"
              src={process.env.PUBLIC_URL + "/images/" + mediaString}
            />
          ))}
        </div>
        <button
          className="absolute right-[-200px] top-0 flex h-min flex-row gap-4 rounded-[25px] bg-black/50 pb-4 pl-8 pr-8 pt-4 shadow-xl drop-shadow-closeButton backdrop-blur-xl hover:bg-offwhite hover:text-black"
          onClick={() =>
            setSearchParams({
              project: selectedProject.title,
              view: "list",
            })
          }
        >
          <p>Close</p>
          <FullscreenExitIcon />
        </button>
      </div>
    );
  };

  const BodySection = () => {
    if (showGallery) {
      return Gallery();
    }
    return MainPage();
  };

  return (
    <div className="absolute flex h-full w-full animate-fadeIn flex-row gap-8 overflow-clip bg-black p-4">
      {BodySection()}

      <div className="h-full w-[2px] bg-[#30302B4D]" />

      {/* Contact section */}
      <div className="grid grow place-items-end">
        <div className="pb-8 pr-8 text-right">
          <p className="right-0 text-4xl font-bold">Contact</p>
          <a
            className="select-text text-base font-light text-[#71BBFF] hover:underline"
            href="mailto:hello@less3.design"
          >
            hello@less3.design
          </a>
          <br />
          <a
            className="text-base font-light text-[#71BBFF] hover:underline"
            href="https://twitter.com/AlanSherba"
            target="_blank"
          >
            Twitter
          </a>
          <br />
          <a
            className="text-base font-light text-[#71BBFF] hover:underline"
            href="https://www.linkedin.com/in/alan-sherba-365784141/"
            target="_blank"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;

import { useEffect, useState } from "react";
import Markdown from "./components/Markdown";
import ProfileCard from "./components/profileCard";
import { ProjectData, loadProjects } from "./Projects";

function AppMobile() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  useEffect(() => {
    loadProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  return (
    <div className="flex flex-col gap-4 p-4">
      <ProfileCard background={false} />

      <div className="flex flex-col gap-4 rounded-[32px] pb-12 pl-8 pr-8 text-lg">
        <a
          className="text-lg font-bold text-[#71BBFF] hover:underline"
          href="mailto:alansherba@gmail.com"
        >
          alansherba@gmail.com
        </a>
        <a
          className="text-lg font-bold text-[#71BBFF] hover:underline"
          href="https://twitter.com/AlanSherba"
          target="_blank"
        >
          Twitter
        </a>
        <a
          className="text-lg font-bold text-[#71BBFF] hover:underline"
          href="https://www.linkedin.com/in/alan-sherba-365784141/"
          target="_blank"
        >
          LinkedIn
        </a>
      </div>

      {/* Every project's full page, one after another */}
      {projects.map((project) => (
        <article key={project.title} className="flex flex-col gap-6 pt-8">
          <h2 className="font-serif text-4xl leading-none text-white">
            {project.title}
          </h2>
          <Markdown>{project.body}</Markdown>
        </article>
      ))}
    </div>
  );
}

export default AppMobile;

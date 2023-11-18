import ProfileCard from "./components/profileCard";
import {
  ProjectDatabase,
} from "./ProjectsDatabase";

function AppMobile() {
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

      <p className="pl-8 pr-8 text-center opacity-30">
        View on desktop for project details
      </p>

      {ProjectDatabase.map((project) => (
        <>
          {project.media.slice(1).map((mediaURL) => (
            <img
              key={mediaURL}
              className="object-fit box-border h-fit w-full rounded-[32px] border border-offwhite/[0.05]"
              src={process.env.PUBLIC_URL + "/images/" + mediaURL}
            />
          ))}
        </>
      ))}
    </div>
  );
}

export default AppMobile;

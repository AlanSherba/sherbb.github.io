interface ProfileCardProps {
  background: boolean;
}
const ProfileCard = (props: ProfileCardProps) => {
  return (
    <div
      className={
        "rounded-[32px] p-8 " +
        (props.background ? "border border-offwhite/[0.05] bg-offwhite/[0.03]" : "")
      }
    >
      <p className="text-4xl font-light">
        Alan Sherba
        <span className="pl-0 text-sm opacity-30"> aka: Sherbb</span>
      </p>
      <div className="h-4" />
      <p className="text-base font-light">
        Gameplay <span className="font-black">Programmer</span>
      </p>
      <p className="text-base font-light">
        UI, UX, Feel, Action, Game <span className="font-black">Designer</span>
      </p>
      <p className="text-base font-light">
        Unity <span className="font-black">Engineer</span>
      </p>
      <p className="text-base font-light">
        VFX, Tech <span className="font-black">Artist</span>
      </p>
    </div>
  );
};

export default ProfileCard;

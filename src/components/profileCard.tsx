import Panel from "./Panel";

interface ProfileCardProps
{
  background: boolean;
}
const ProfileCard = (props: ProfileCardProps) =>
{
  return (
    <Panel>
      <p className="text-4xl font-light">
        Alan Sherba
        <span className="pl-0 text-sm opacity-30"> aka: Sherbb, Coda</span>
      </p>
      <div className="h-2" />
      <p className="text-base font-light">
        <span className="font-black">Creative Director</span>
      </p>
      <p className="text-base font-light">
        Engineer, Designer, Artist, Gaming Enthusiast
      </p>
    </Panel>
  );
};

export default ProfileCard;

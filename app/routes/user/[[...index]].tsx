import { UserProfile } from "@clerk/remix";

const UserProfilePage = () => (
  <div className="flex justify-center items-center h-screen">
    <UserProfile path="/user" routing="path" />
  </div>
);

export default UserProfilePage; 
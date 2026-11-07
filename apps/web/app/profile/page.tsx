import type { Metadata } from "next";
import ProfileView from "../../components/profile/profile-view";

export const metadata: Metadata = {
  title: "Thông tin cá nhân | BrewLite",
};

export default function ProfilePage() {
  return <ProfileView />;
}
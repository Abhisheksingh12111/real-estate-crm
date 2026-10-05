import AuthGuard from "@/components/AuthGuard";
import RealEstateFrame from "../RealEstateFrame";

export default function RealEstateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <RealEstateFrame>{children}</RealEstateFrame>
    </AuthGuard>
  );
}
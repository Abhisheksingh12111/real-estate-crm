import RealEstateFrame from "../RealEstateFrame";

export default function RealEstateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RealEstateFrame>{children}</RealEstateFrame>;
}

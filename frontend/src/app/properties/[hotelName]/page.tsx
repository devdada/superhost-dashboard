import { PropertyPage } from "@/components/property/PropertyPage";

type Props = {
  params: Promise<{ hotelName: string }>;
};

export default async function PropertyRoutePage({ params }: Props) {
  const { hotelName } = await params;
  return <PropertyPage hotelSlug={hotelName} />;
}

import { redirect } from "next/navigation";

type PreBookPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PreBookPage({ params }: PreBookPageProps) {
  const { id } = await params;
  redirect(`/deposit/${id}`);
}

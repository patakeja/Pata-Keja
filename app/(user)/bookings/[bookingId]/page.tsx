import { BookingChatPanel } from "@/components/features/chat/booking-chat-panel";
import { PageShell } from "@/components/ui/page-shell";

type BookingDetailPageProps = {
  params: Promise<{
    bookingId: string;
  }>;
};

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { bookingId } = await params;

  return (
    <PageShell className="py-3 pb-6">
      <BookingChatPanel bookingId={bookingId} />
    </PageShell>
  );
}

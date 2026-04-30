"use client";

import { useDeferredValue, useEffect, useState } from "react";

import { pushCampaignService } from "@/lib/pushCampaignService";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import {
  PaymentStatus,
  PushCampaignReachType,
  PushCampaignStatus,
  type PushCampaignListingOption,
  type PushCampaignQuote,
  type PushCampaignRecord
} from "@/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PushCampaignsPanelProps = {
  workspaceLabel: "admin" | "landlord";
};

const selectClassName =
  "flex h-10 w-full rounded-xl border border-input bg-white px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

const reachTypeOptions = [
  { value: PushCampaignReachType.AREA, label: "Area" },
  { value: PushCampaignReachType.TOWN, label: "Town" },
  { value: PushCampaignReachType.COUNTY, label: "County" }
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while managing campaigns.";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2
  }).format(value);
}

function formatReachLabel(listing: PushCampaignListingOption | undefined, reachType: PushCampaignReachType) {
  if (!listing) {
    return "Select a listing";
  }

  if (reachType === PushCampaignReachType.AREA) {
    return listing.areaName || "Target listing area";
  }

  if (reachType === PushCampaignReachType.TOWN) {
    return listing.townName || "Target listing town";
  }

  return listing.countyName || "Target listing county";
}

export function PushCampaignsPanel({ workspaceLabel }: PushCampaignsPanelProps) {
  const { session, status, user } = useAuthStore();
  const [listings, setListings] = useState<PushCampaignListingOption[]>([]);
  const [campaigns, setCampaigns] = useState<PushCampaignRecord[]>([]);
  const [quote, setQuote] = useState<PushCampaignQuote | null>(null);
  const [selectedListingId, setSelectedListingId] = useState("");
  const [reachType, setReachType] = useState<PushCampaignReachType>(PushCampaignReachType.AREA);
  const [frequencyPerWeek, setFrequencyPerWeek] = useState("3");
  const [durationDays, setDurationDays] = useState("7");
  const [paymentPhone, setPaymentPhone] = useState(user?.phone ?? "");
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  const deferredListingId = useDeferredValue(selectedListingId);
  const deferredReachType = useDeferredValue(reachType);
  const deferredFrequencyPerWeek = useDeferredValue(frequencyPerWeek);
  const deferredDurationDays = useDeferredValue(durationDays);
  const selectedListing = listings.find((listing) => listing.id === selectedListingId);

  useEffect(() => {
    if (user?.phone) {
      setPaymentPhone((currentPhone) => currentPhone || user.phone || "");
    }
  }, [user?.phone]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let isMounted = true;

    void (async () => {
      setIsLoading(true);

      try {
        const [nextListings, nextCampaigns] = await Promise.all([
          pushCampaignService.getCampaignListingOptions(),
          pushCampaignService.getMyCampaigns()
        ]);

        if (!isMounted) {
          return;
        }

        setListings(nextListings);
        setCampaigns(nextCampaigns);
        setSelectedListingId((currentListingId) => currentListingId || nextListings[0]?.id || "");
      } catch (error) {
        if (isMounted) {
          setFeedback({ tone: "error", message: getErrorMessage(error) });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [status]);

  useEffect(() => {
    if (!deferredListingId) {
      setQuote(null);
      return;
    }

    const normalizedFrequencyPerWeek = Number.parseInt(deferredFrequencyPerWeek, 10);
    const normalizedDurationDays = Number.parseInt(deferredDurationDays, 10);

    if (!Number.isFinite(normalizedFrequencyPerWeek) || !Number.isFinite(normalizedDurationDays)) {
      setQuote(null);
      return;
    }

    let isMounted = true;

    void (async () => {
      setIsQuoteLoading(true);

      try {
        const nextQuote = await pushCampaignService.getCampaignQuote(
          deferredListingId,
          deferredReachType,
          normalizedFrequencyPerWeek,
          normalizedDurationDays
        );

        if (isMounted) {
          setQuote(nextQuote);
        }
      } catch (error) {
        if (isMounted) {
          setFeedback({ tone: "error", message: getErrorMessage(error) });
          setQuote(null);
        }
      } finally {
        if (isMounted) {
          setIsQuoteLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [deferredDurationDays, deferredFrequencyPerWeek, deferredListingId, deferredReachType]);

  useEffect(() => {
    if (!pendingPaymentId) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const payment = await pushCampaignService.getCampaignPaymentById(pendingPaymentId);

          if (payment.status === PaymentStatus.COMPLETED) {
            const nextCampaigns = await pushCampaignService.getMyCampaigns();
            setCampaigns(nextCampaigns);
            setPendingPaymentId(null);
            setFeedback({ tone: "success", message: "Campaign payment confirmed. The campaign is now active." });
          } else if (payment.status === PaymentStatus.FAILED) {
            setPendingPaymentId(null);
            setFeedback({ tone: "error", message: "Campaign payment failed. You can retry from the campaign list." });
          }
        } catch {
          // Quietly retry while polling.
        }
      })();
    }, 8000);

    return () => {
      window.clearInterval(interval);
    };
  }, [pendingPaymentId]);

  async function refreshCampaigns() {
    const nextCampaigns = await pushCampaignService.getMyCampaigns();
    setCampaigns(nextCampaigns);
  }

  async function startPaymentForCampaign(campaignId: string) {
    if (!session?.access_token) {
      throw new Error("Your session expired. Sign in again to pay for the campaign.");
    }

    const response = await fetch("/api/campaigns/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        campaignId,
        phone: paymentPhone
      })
    });

    const payload = (await response.json()) as {
      customerMessage?: string;
      payment?: { id: string; status: PaymentStatus };
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message || "Unable to start the campaign payment.");
    }

    if (payload.payment?.status === PaymentStatus.COMPLETED) {
      setPendingPaymentId(null);
    } else if (payload.payment?.id) {
      setPendingPaymentId(payload.payment.id);
    }

    setFeedback({
      tone: "success",
      message: payload.customerMessage || "Payment request sent to your phone."
    });
  }

  async function handleCreateAndPay() {
    const normalizedFrequencyPerWeek = Number.parseInt(frequencyPerWeek, 10);
    const normalizedDurationDays = Number.parseInt(durationDays, 10);

    if (!selectedListingId) {
      setFeedback({ tone: "error", message: "Select a listing before launching a campaign." });
      return;
    }

    if (!paymentPhone.trim()) {
      setFeedback({ tone: "error", message: "Add a Safaricom phone number for payment." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const campaign = await pushCampaignService.createCampaign({
        listingId: selectedListingId,
        reachType,
        frequencyPerWeek: normalizedFrequencyPerWeek,
        durationDays: normalizedDurationDays
      });
      await refreshCampaigns();
      await startPaymentForCampaign(campaign.id);
    } catch (error) {
      setFeedback({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRetryPayment(campaignId: string) {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      await startPaymentForCampaign(campaignId);
      await refreshCampaigns();
    } catch (error) {
      setFeedback({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(campaign: PushCampaignRecord) {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const nextStatus =
        campaign.status === PushCampaignStatus.ACTIVE ? PushCampaignStatus.PAUSED : PushCampaignStatus.ACTIVE;
      await pushCampaignService.updateCampaignStatus(campaign.id, nextStatus);
      await refreshCampaigns();
    } catch (error) {
      setFeedback({ tone: "error", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (status !== "authenticated") {
    return null;
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <div className="space-y-1">
              <h1 className="text-base font-semibold text-foreground">
                {workspaceLabel === "admin" ? "Admin push campaigns" : "Listing push campaigns"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Build paid house campaigns with smart location targeting, live CPM pricing, and automatic activation
                after payment.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="campaign-listing" className="text-[11px] font-medium text-foreground">
                  Listing
                </label>
                <select
                  id="campaign-listing"
                  className={selectClassName}
                  value={selectedListingId}
                  onChange={(event) => setSelectedListingId(event.target.value)}
                  disabled={isLoading || listings.length === 0}
                >
                  <option value="">{isLoading ? "Loading..." : "Select a listing"}</option>
                  {listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.title} - {listing.areaName}, {listing.townName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="campaign-reach" className="text-[11px] font-medium text-foreground">
                  Reach type
                </label>
                <select
                  id="campaign-reach"
                  className={selectClassName}
                  value={reachType}
                  onChange={(event) => setReachType(event.target.value as PushCampaignReachType)}
                >
                  {reachTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="campaign-frequency" className="text-[11px] font-medium text-foreground">
                  Frequency per week
                </label>
                <input
                  id="campaign-frequency"
                  className={selectClassName}
                  type="number"
                  min={1}
                  max={14}
                  value={frequencyPerWeek}
                  onChange={(event) => setFrequencyPerWeek(event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="campaign-duration" className="text-[11px] font-medium text-foreground">
                  Duration days
                </label>
                <input
                  id="campaign-duration"
                  className={selectClassName}
                  type="number"
                  min={1}
                  max={90}
                  value={durationDays}
                  onChange={(event) => setDurationDays(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="campaign-phone" className="text-[11px] font-medium text-foreground">
                Payment phone
              </label>
              <input
                id="campaign-phone"
                className={selectClassName}
                type="tel"
                placeholder="07..."
                value={paymentPhone}
                onChange={(event) => setPaymentPhone(event.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Quote</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{formatReachLabel(selectedListing, reachType)}</p>
            {quote ? (
              <div className="mt-3 space-y-2">
                <div className="rounded-md bg-white px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Estimated reach</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{quote.audienceSize.toLocaleString()}</p>
                </div>
                <div className="rounded-md bg-white px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Impressions</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {quote.estimatedImpressions.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-md bg-white px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Total price</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{formatCurrency(quote.priceTotal)}</p>
                  <p className="text-[11px] text-muted-foreground">CPM {formatCurrency(quote.cpm)}</p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                {isQuoteLoading ? "Calculating quote..." : "Select a listing and campaign settings to estimate pricing."}
              </p>
            )}

            <Button className="mt-3 w-full" onClick={() => void handleCreateAndPay()} disabled={isSubmitting || isLoading || !quote}>
              {isSubmitting ? "Processing..." : "Pay and activate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {feedback ? (
        <Card className={cn(feedback.tone === "error" ? "border-rose-200" : "border-emerald-200")}>
          <CardContent className={cn("py-3 text-xs", feedback.tone === "error" ? "text-rose-700" : "text-emerald-700")}>
            {feedback.message}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Campaigns</p>
              <p className="text-xs text-muted-foreground">
                Monitor live reach, retry failed payments, and pause campaigns without losing pricing history.
              </p>
            </div>
            {pendingPaymentId ? <Badge>Awaiting callback</Badge> : null}
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading campaigns...</p>
          ) : campaigns.length > 0 ? (
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const canToggle = campaign.paymentStatus === PaymentStatus.COMPLETED && campaign.status !== PushCampaignStatus.COMPLETED;
                const needsPayment = campaign.paymentStatus !== PaymentStatus.COMPLETED && campaign.status !== PushCampaignStatus.COMPLETED;

                return (
                  <div key={campaign.id} className="rounded-2xl border border-border/80 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{campaign.listingTitle ?? "Listing campaign"}</p>
                          <Badge>{campaign.reachType}</Badge>
                          <Badge>{campaign.status}</Badge>
                          <Badge>{campaign.paymentStatus}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(campaign.areaName && campaign.reachType === PushCampaignReachType.AREA
                            ? campaign.areaName
                            : campaign.reachType === PushCampaignReachType.TOWN
                              ? campaign.townName
                              : campaign.countyName) || "Target location"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(campaign.priceTotal)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {campaign.audienceSize.toLocaleString()} reach / {campaign.impressionsSent.toLocaleString()} sent
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {needsPayment ? (
                        <Button onClick={() => void handleRetryPayment(campaign.id)} disabled={isSubmitting}>
                          Pay now
                        </Button>
                      ) : null}
                      {canToggle ? (
                        <Button variant="outline" onClick={() => void handleToggleStatus(campaign)} disabled={isSubmitting}>
                          {campaign.status === PushCampaignStatus.ACTIVE ? "Pause" : "Resume"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No push campaigns created yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

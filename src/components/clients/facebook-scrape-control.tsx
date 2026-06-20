"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatDate } from "@/lib/format";

export function FacebookScrapeControl({
  clientId,
  initialUrl,
  showControls = true,
  showPosts = true,
}: {
  clientId: string;
  initialUrl?: string;
  showControls?: boolean;
  showPosts?: boolean;
}) {
  const scrapeFacebook = useAction(api.socialActions.scrapeClientFacebookPosts);
  const saveFacebookUrl = useMutation(api.social.saveClientFacebookProfileUrl);
  const posts = useQuery(api.social.listClientFacebookPosts, {
    clientId: clientId as Id<"clients">,
  });
  const [facebookProfileUrl, setFacebookProfileUrl] = useState(initialUrl ?? "");
  const [status, setStatus] = useState<"Idle" | "Running" | "Done" | "Error">(
    "Idle",
  );
  const [message, setMessage] = useState("");

  const disabled = status === "Running" || facebookProfileUrl.trim().length === 0;

  async function onScrape() {
    setStatus("Running");
    setMessage("");
    try {
      const saved = await saveFacebookUrl({
        clientId: clientId as Id<"clients">,
        facebookProfileUrl,
      });
      setFacebookProfileUrl(saved.facebookProfileUrl);
      const result = await scrapeFacebook({
        clientId: clientId as Id<"clients">,
        facebookProfileUrl: saved.facebookProfileUrl,
        maxPosts: 10,
      });
      setStatus("Done");
      setMessage(
        `${result.itemCount} posts scraped · ${result.inserted} new · ${result.updated} updated`,
      );
    } catch (error) {
      setStatus("Error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {showControls && (
        <div className="flex gap-2">
          <input
            type="url"
            value={facebookProfileUrl}
            onChange={(event) => setFacebookProfileUrl(event.target.value)}
            placeholder="https://facebook.com/profile"
            className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-[#FBF8F1] px-3 text-[13px] font-medium text-ink-soft outline-none transition-colors placeholder:text-faint focus:border-accent"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={onScrape}
            className="inline-flex h-10 flex-none items-center justify-center rounded-lg bg-accent px-3 text-[12px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "Running" ? "Scraping..." : "Scrape"}
          </button>
        </div>
      )}
      {showControls && message && (
        <p
          className={`m-0 text-[12px] leading-snug ${
            status === "Error" ? "text-[#9C3B33]" : "text-muted"
          }`}
        >
          {message}
        </p>
      )}
      {showPosts && (
        <div
          className={showControls ? "mt-2 border-t border-line-soft pt-2.5" : ""}
        >
          {posts === undefined ? (
            <p className="m-0 text-[12px] text-quiet">Loading scraped posts...</p>
          ) : posts.length === 0 ? (
            <p className="m-0 text-[12px] text-quiet">
              No Facebook posts scraped yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {posts.slice(0, 3).map((post) => (
                <a
                  key={post._id}
                  href={post.postUrl ?? post.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg bg-[#F3EFE6] px-3 py-2.5 text-left"
                >
                  <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-dim">
                    {post.postedAt ? formatDate(post.postedAt) : "Scraped post"}
                  </div>
                  <p className="m-0 line-clamp-3 text-[12.5px] leading-snug text-body">
                    {post.text || "No post text available."}
                  </p>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

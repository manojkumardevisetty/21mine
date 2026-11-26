"use client";
import { StatefulForm } from "./StatefulForm";
import { useActionState, useState } from "react";
import { submitReview } from "@/app/actions/reviews";
import { Field, TextArea } from "./Field";
import { SubmitButton } from "./SubmitButton";

export function ReviewForm({ productId, defaultName, existing }: { productId: string; defaultName: string; existing?: { rating: number; title: string; body: string; displayName: string; status: string } | null }) {
  const [state, action] = useActionState(submitReview, null);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  if (state?.ok) return <p role="status" className="rounded-xl border border-ok/30 bg-ok/5 p-4 text-sm text-ok">{state.message}</p>;
  return (
    <StatefulForm action={action} className="card space-y-4 p-5" noValidate>
      <h3 className="font-display text-2xl">{existing ? "Update your review" : "Write a review"}</h3>
      {existing && <p className="text-xs text-muted">Status: {existing.status.toLowerCase()}. Editing sends it for approval again.</p>}
      <input type="hidden" name="productId" value={productId} />
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer text-2xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rose-deep rounded">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <span aria-hidden="true" className={n <= rating ? "text-gold" : "text-sand"}>★</span>
              <span className="sr-only">{n} star{n > 1 ? "s" : ""}</span>
            </label>
          ))}
        </div>
        {state?.errors?.rating && <p className="field-error" role="alert">{state.errors.rating}</p>}
      </fieldset>
      <Field label="Title" name="title" defaultValue={existing?.title} maxLength={80} error={state?.errors?.title} required />
      <TextArea label="Your review" name="body" defaultValue={existing?.body} maxLength={2000} error={state?.errors?.body} required />
      <Field label="Display name" name="displayName" defaultValue={existing?.displayName ?? defaultName} maxLength={40} error={state?.errors?.displayName} hint="Shown publicly with your review" required />
      {state && !state.ok && <p className="field-error" role="alert">{state.message}</p>}
      <SubmitButton pendingText="Submitting…">Submit review</SubmitButton>
    </StatefulForm>
  );
}

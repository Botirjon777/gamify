"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonClass } from "@/components/ui/button";
import { ICON_NAMES } from "@/components/icon";
import type { ContentStatus } from "@/generated/prisma/enums";
import type { Category } from "@/features/learn/categories";
import { SUBJECT_CATEGORIES, SUBJECTS, type Subject } from "@/features/learn/subjects";
import { createCmsTrack, updateCmsTrack } from "../cms-actions";
import { StatusOptions } from "./cms-status-controls";
import { Field, FormButtons, areaClass, inputClass, slugify, useCmsAction, useDialog } from "./cms-ui";

export interface TrackFormData {
  id: string;
  slug: string;
  title: string;
  description: string;
  subject: Subject;
  category: Category | null;
  icon: string | null;
  order: number;
  status: ContentStatus;
}

/** Create a course, or edit one (`track` given). */
export function TrackFormDialog({ track }: { track?: TrackFormData }) {
  const t = useTranslations("admin.cms");
  const dialog = useDialog();

  return (
    <>
      {track ? (
        <button type="button" onClick={dialog.open} className={buttonClass("secondary", "h-9 px-3 text-xs")}>
          <Pencil className="size-3.5" /> {t("edit")}
        </button>
      ) : (
        <Button onClick={dialog.open}>
          <Plus className="size-4" /> {t("track.new")}
        </Button>
      )}
      <dialog {...dialog.props} aria-label={track ? t("track.editTitle") : t("track.newTitle")}>
        {dialog.isOpen && <TrackForm track={track} close={dialog.close} />}
      </dialog>
    </>
  );
}

function TrackForm({ track, close }: { track?: TrackFormData; close: () => void }) {
  const t = useTranslations("admin.cms");
  const tLearn = useTranslations("learn");
  const { pending, run } = useCmsAction();

  const [title, setTitle] = useState(track?.title ?? "");
  const [slug, setSlug] = useState(track?.slug ?? "");
  const [description, setDescription] = useState(track?.description ?? "");
  const [subject, setSubject] = useState<Subject>(track?.subject ?? "PROGRAMMING");
  const [category, setCategory] = useState<Category | null>(track?.category ?? null);
  const [icon, setIcon] = useState(track?.icon ?? "");
  const [order, setOrder] = useState(track?.order ?? 0);
  const [status, setStatus] = useState<ContentStatus>(track?.status ?? "DRAFT");

  const categories = SUBJECT_CATEGORIES[subject];
  // A subject with categories always needs one; the others never have one.
  const chosenCategory = categories.length ? (category && categories.includes(category) ? category : categories[0]) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = { slug, titleUz: title, descriptionUz: description, subject, category: chosenCategory, icon, order, status };
    run(() => (track ? updateCmsTrack(track.id, input) : createCmsTrack(input)), track ? t("track.saved") : t("track.created"), close);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 p-6 text-foreground">
      <h2 className="font-display text-lg font-bold">{track ? t("track.editTitle") : t("track.newTitle")}</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("fields.title")}>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!track) setSlug(slugify(e.target.value));
            }}
            required
            minLength={2}
            maxLength={100}
            className={inputClass}
          />
        </Field>
        <Field label={t("fields.slug")} hint={t("fields.slugHint")}>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} required pattern="[a-z0-9\-]+" className={`${inputClass} font-mono text-xs`} />
        </Field>
      </div>

      <Field label={t("fields.description")}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} className={areaClass} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("fields.subject")}>
          <select value={subject} onChange={(e) => setSubject(e.target.value as Subject)} className={inputClass}>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {tLearn(`subjects.${s}.title`)}
              </option>
            ))}
          </select>
        </Field>
        {chosenCategory && (
          <Field label={t("fields.category")}>
            <select value={chosenCategory} onChange={(e) => setCategory(e.target.value as Category)} className={inputClass}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {tLearn(`categories.${c}.title`)}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("fields.icon")}>
          <select value={icon} onChange={(e) => setIcon(e.target.value)} className={inputClass}>
            <option value="">{t("fields.iconDefault")}</option>
            {ICON_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("fields.status")}>
          <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className={inputClass}>
            <StatusOptions />
          </select>
        </Field>
        <Field label={t("fields.order")}>
          <input type="number" min={0} value={order} onChange={(e) => setOrder(Number(e.target.value))} className={inputClass} />
        </Field>
      </div>

      <FormButtons pending={pending} onCancel={close} />
    </form>
  );
}

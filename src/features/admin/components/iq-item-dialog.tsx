"use client";

import { useState } from "react";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonClass } from "@/components/ui/button";
import type { ContentStatus } from "@/generated/prisma/enums";
import { toast } from "@/components/ui/toast";
import { IQ_CATEGORIES, IQ_MAX_OPTIONS, type IqOptionsImage } from "@/features/iq/content-schema";
import { IqImage, IqOptionCell } from "@/features/iq/components/iq-picture";
import { mediaUrl } from "@/lib/media";
import { saveCmsIqItem, uploadCmsIqImage } from "../cms-actions";
import { StatusOptions } from "./cms-status-controls";
import { Field, FormButtons, areaClass, inputClass, useCmsAction, useDialog } from "./cms-ui";

type IqCategory = (typeof IQ_CATEGORIES)[number];

export interface IqItemData {
  id: string;
  key: string;
  category: IqCategory;
  difficulty: number;
  prompt: string;
  figure: string;
  /** Media paths. */
  image?: string;
  optionsImage?: IqOptionsImage;
  options: string[];
  answer: number;
  status: ContentStatus;
}

/** Create an IQ question, or edit one (`item` given). `nextKeys`: suggested key per category for a new one. */
export function IqItemDialog({ item, nextKeys }: { item?: IqItemData; nextKeys: Record<IqCategory, string> }) {
  const t = useTranslations("admin.cms");
  const dialog = useDialog();
  return (
    <>
      {item ? (
        <button type="button" onClick={dialog.open} className={buttonClass("secondary", "h-9 px-3 text-xs")}>
          <Pencil className="size-3.5" /> {t("edit")}
        </button>
      ) : (
        <Button onClick={dialog.open}>
          <Plus className="size-4" /> {t("iq.new")}
        </Button>
      )}
      <dialog {...dialog.props} aria-label={item ? t("iq.editTitle") : t("iq.newTitle")}>
        {dialog.isOpen && <IqItemForm item={item} nextKeys={nextKeys} close={dialog.close} />}
      </dialog>
    </>
  );
}

function IqItemForm({ item, nextKeys, close }: { item?: IqItemData; nextKeys: Record<IqCategory, string>; close: () => void }) {
  const t = useTranslations("admin.cms");
  const { pending, run } = useCmsAction();

  const [category, setCategory] = useState<IqCategory>(item?.category ?? "logic");
  /** null = follow the suggestion for the chosen category. */
  const [typedKey, setTypedKey] = useState<string | null>(item?.key ?? null);
  const key = typedKey ?? nextKeys[category];
  const [difficulty, setDifficulty] = useState(item?.difficulty ?? 1);
  const [prompt, setPrompt] = useState(item?.prompt ?? "");
  const [figure, setFigure] = useState(item?.figure ?? "");
  const [image, setImage] = useState(item?.image);
  const [sheet, setSheet] = useState(item?.optionsImage);
  // With an answers picture the stored options are just the cell numbers — not something to edit as text.
  const [options, setOptions] = useState<string[]>(item && !item.optionsImage ? item.options : ["", "", "", ""]);
  const [answer, setAnswer] = useState(item?.answer ?? 0);
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? "PUBLISHED");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      () => saveCmsIqItem({ key, category, difficulty, promptUz: prompt, figure, image, optionsImage: sheet, optionsUz: options, answerIndex: answer, status }, item?.id),
      item ? t("iq.saved") : t("iq.created"),
      close,
    );
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 p-6 text-foreground">
      <h2 className="font-display text-lg font-bold">{item ? t("iq.editTitle") : t("iq.newTitle")}</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("fields.category")}>
          <select value={category} onChange={(e) => setCategory(e.target.value as IqCategory)} className={inputClass}>
            {IQ_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`iq.categories.${c}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("fields.key")}>
          <input value={key} onChange={(e) => setTypedKey(e.target.value)} required pattern="[a-z0-9\-]+" className={`${inputClass} font-mono text-xs`} />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("fields.difficulty")}>
          <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className={inputClass}>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {t(`iq.difficulty.${d}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("fields.status")}>
          <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className={inputClass}>
            <StatusOptions />
          </select>
        </Field>
      </div>

      <Field label={t("fields.prompt")}>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} required rows={2} className={areaClass} />
      </Field>
      <Field label={t("iq.figure")} hint={t("iq.figureHint")}>
        <input value={figure} onChange={(e) => setFigure(e.target.value)} className={`${inputClass} text-center font-mono font-bold`} />
      </Field>

      <Field label={t("iq.image")} hint={t("iq.imageHint")}>
        <PictureInput path={image} onChange={setImage} />
      </Field>
      <Field label={t("iq.optionsImage")} hint={t("iq.optionsImageHint")}>
        <PictureInput
          path={sheet?.src}
          onChange={(src) => {
            setSheet(src ? { src, columns: sheet?.columns ?? 4, rows: sheet?.rows ?? 2 } : undefined);
            setAnswer(0);
          }}
          preview={false}
        />
      </Field>

      {sheet ? (
        <fieldset className="flex flex-col gap-3 border-t border-border pt-4">
          <legend className="mb-1 text-sm font-semibold">{t("fields.options")}</legend>
          <div className="grid grid-cols-2 gap-3">
            {(["columns", "rows"] as const).map((side) => (
              <Field key={side} label={t(`iq.${side}`)}>
                <select
                  value={sheet[side]}
                  onChange={(e) => {
                    setSheet({ ...sheet, [side]: Number(e.target.value) });
                    setAnswer(0);
                  }}
                  className={inputClass}
                >
                  {Array.from({ length: side === "columns" ? IQ_MAX_OPTIONS : 4 }, (_, i) => i + 1)
                    .filter((n) => n * sheet[side === "columns" ? "rows" : "columns"] <= IQ_MAX_OPTIONS)
                    .map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                </select>
              </Field>
            ))}
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sheet.columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: sheet.columns * sheet.rows }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={t("fields.correctOption", { n: i + 1 })}
                aria-pressed={answer === i}
                onClick={() => setAnswer(i)}
                className={`overflow-hidden rounded-xl border-2 bg-white p-1 ${answer === i ? "border-success ring-4 ring-success/25" : "border-border"}`}
              >
                <IqOptionCell sheet={{ ...sheet, src: mediaUrl(sheet.src) }} index={i} />
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <fieldset className="flex flex-col gap-2 border-t border-border pt-4">
          <legend className="mb-1 text-sm font-semibold">{t("fields.options")}</legend>
          {options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="iq-answer" checked={answer === i} onChange={() => setAnswer(i)} aria-label={t("fields.correctOption", { n: i + 1 })} className="size-4 cursor-pointer" />
              <input
                value={option}
                onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
                placeholder={t("fields.optionN", { n: i + 1 })}
                required
                className={inputClass}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  aria-label={t("delete")}
                  onClick={() => {
                    setOptions(options.filter((_, j) => j !== i));
                    setAnswer(answer > i ? answer - 1 : answer === i ? 0 : answer);
                  }}
                  className="rounded-lg p-2 text-danger hover:bg-danger/10"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <button type="button" onClick={() => setOptions([...options, ""])} className="mt-1 inline-flex w-fit items-center gap-1.5 text-xs font-bold text-brand hover:underline">
              <Plus className="size-3.5" /> {t("fields.addOption")}
            </button>
          )}
        </fieldset>
      )}

      <FormButtons pending={pending} onCancel={close} />
    </form>
  );
}

/** Upload a picture to the media store; holds its media path. */
function PictureInput({ path, onChange, preview = true }: { path?: string; onChange: (path: string | undefined) => void; preview?: boolean }) {
  const t = useTranslations("admin.cms");
  const [busy, setBusy] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.set("file", file);
    const result = await uploadCmsIqImage(form).catch(() => ({ ok: false as const, error: "network" as const, detail: undefined }));
    setBusy(false);
    if (result.ok) onChange(result.path);
    else toast.error(t(`errors.${result.error}`) + (result.detail ? ` (${result.detail})` : ""));
  };

  return (
    <span className="flex items-center gap-3">
      {path && preview && <IqImage src={mediaUrl(path)} className="size-24 rounded-xl p-1" />}
      <span className={buttonClass("secondary", `relative h-9 cursor-pointer px-3 text-xs ${busy ? "opacity-60" : ""}`)}>
        <ImagePlus className="size-3.5" /> {t("iq.upload")}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          disabled={busy}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </span>
      {path && (
        <button type="button" aria-label={t("iq.removeImage")} onClick={() => onChange(undefined)} className="rounded-lg p-2 text-danger hover:bg-danger/10">
          <X className="size-4" />
        </button>
      )}
    </span>
  );
}

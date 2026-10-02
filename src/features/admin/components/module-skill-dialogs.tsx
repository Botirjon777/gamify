"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { toast } from "@/components/ui/toast";
import { deleteCmsModule, deleteCmsSkill, saveCmsModule, saveCmsSkill } from "../cms-actions";
import { Field, FormButtons, areaClass, inputClass, slugify, useCmsAction, useDialog } from "./cms-ui";

interface ModuleData {
  id: string;
  slug: string;
  title: string;
  order: number;
}

/** Add a mod to a course, or edit / delete one (`mod` given). `nextOrder`: where a new one goes. */
export function ModuleDialog({ trackId, mod, nextOrder = 0 }: { trackId: string; mod?: ModuleData; nextOrder?: number }) {
  const t = useTranslations("admin.cms");
  const dialog = useDialog();
  return (
    <>
      {mod ? (
        <button type="button" onClick={dialog.open} aria-label={t("module.editTitle")} title={t("module.editTitle")} className="p-1 text-muted hover:text-foreground">
          <Pencil className="size-4" />
        </button>
      ) : (
        <Button onClick={dialog.open} variant="secondary" className="h-9 text-xs">
          <Plus className="size-3.5" /> {t("module.new")}
        </Button>
      )}
      <dialog {...dialog.props} aria-label={mod ? t("module.editTitle") : t("module.newTitle")}>
        {dialog.isOpen && <ModuleForm trackId={trackId} mod={mod} nextOrder={nextOrder} close={dialog.close} />}
      </dialog>
    </>
  );
}

function ModuleForm({ trackId, mod, nextOrder, close }: { trackId: string; mod?: ModuleData; nextOrder: number; close: () => void }) {
  const t = useTranslations("admin.cms");
  const { pending, run, attempt } = useCmsAction();
  const [title, setTitle] = useState(mod?.title ?? "");
  const [slug, setSlug] = useState(mod?.slug ?? "");
  const [order, setOrder] = useState(mod?.order ?? nextOrder);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => saveCmsModule({ trackId, slug, titleUz: title, order }, mod?.id), mod ? t("module.saved") : t("module.created"), close);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 p-6 text-foreground">
      <h2 className="font-display text-lg font-bold">{mod ? t("module.editTitle") : t("module.newTitle")}</h2>
      <Field label={t("fields.title")}>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!mod) setSlug(slugify(e.target.value));
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
      <Field label={t("fields.order")}>
        <input type="number" min={0} value={order} onChange={(e) => setOrder(Number(e.target.value))} className={inputClass} />
      </Field>
      <FormButtons
        pending={pending}
        onCancel={close}
        extra={
          mod && (
            <ConfirmButton
              className="text-xs font-bold text-danger hover:underline"
              title={t("module.deleteTitle", { title: mod.title })}
              text={t("deleteText")}
              confirmLabel={t("delete")}
              onConfirm={async () => {
                const error = await attempt(() => deleteCmsModule(mod.id));
                if (error) return error;
                toast.success(t("module.deleted"));
                close();
              }}
            >
              {t("delete")}
            </ConfirmButton>
          )
        }
      />
    </form>
  );
}

interface SkillData {
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
}

/** Add a skill to a mod, or edit / delete one (`skill` given). */
export function SkillDialog({ moduleId, skill, nextOrder = 0 }: { moduleId: string; skill?: SkillData; nextOrder?: number }) {
  const t = useTranslations("admin.cms");
  const dialog = useDialog();
  return (
    <>
      {skill ? (
        <button type="button" onClick={dialog.open} aria-label={t("skill.editTitle")} title={t("skill.editTitle")} className="p-1 text-muted hover:text-foreground">
          <Pencil className="size-3.5" />
        </button>
      ) : (
        <button type="button" onClick={dialog.open} className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
          <Plus className="size-3" /> {t("skill.new")}
        </button>
      )}
      <dialog {...dialog.props} aria-label={skill ? t("skill.editTitle") : t("skill.newTitle")}>
        {dialog.isOpen && <SkillForm moduleId={moduleId} skill={skill} nextOrder={nextOrder} close={dialog.close} />}
      </dialog>
    </>
  );
}

function SkillForm({ moduleId, skill, nextOrder, close }: { moduleId: string; skill?: SkillData; nextOrder: number; close: () => void }) {
  const t = useTranslations("admin.cms");
  const { pending, run, attempt } = useCmsAction();
  const [title, setTitle] = useState(skill?.title ?? "");
  const [slug, setSlug] = useState(skill?.slug ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [order, setOrder] = useState(skill?.order ?? nextOrder);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(() => saveCmsSkill({ moduleId, slug, titleUz: title, descriptionUz: description, order }, skill?.id), skill ? t("skill.saved") : t("skill.created"), close);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 p-6 text-foreground">
      <h2 className="font-display text-lg font-bold">{skill ? t("skill.editTitle") : t("skill.newTitle")}</h2>
      <Field label={t("fields.title")}>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!skill) setSlug(slugify(e.target.value));
          }}
          required
          minLength={2}
          maxLength={100}
          className={inputClass}
        />
      </Field>
      <Field label={t("fields.slug")} hint={t("skill.slugHint")}>
        <input value={slug} onChange={(e) => setSlug(e.target.value)} required pattern="[a-z0-9\-]+" className={`${inputClass} font-mono text-xs`} />
      </Field>
      <Field label={t("fields.description")}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} className={areaClass} />
      </Field>
      <Field label={t("fields.order")}>
        <input type="number" min={0} value={order} onChange={(e) => setOrder(Number(e.target.value))} className={inputClass} />
      </Field>
      <FormButtons
        pending={pending}
        onCancel={close}
        extra={
          skill && (
            <ConfirmButton
              className="text-xs font-bold text-danger hover:underline"
              title={t("skill.deleteTitle", { title: skill.title })}
              text={t("deleteText")}
              confirmLabel={t("delete")}
              onConfirm={async () => {
                const error = await attempt(() => deleteCmsSkill(skill.id));
                if (error) return error;
                toast.success(t("skill.deleted"));
                close();
              }}
            >
              {t("delete")}
            </ConfirmButton>
          )
        }
      />
    </form>
  );
}

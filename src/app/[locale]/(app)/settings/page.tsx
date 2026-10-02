import { ChevronRight, Crown, Gift, Lock, Monitor } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSession } from "@/lib/auth/session";
import { Avatar } from "@/components/avatar";
import { PageHeader } from "@/components/page-header";
import { AVATAR_UNLOCK_LEVEL } from "@/features/badges/catalog";
import { effectivePlan } from "@/features/plans/plans";
import { REFERRAL_INVITER_XP, REFERRAL_REWARD_LEVEL } from "@/features/gamification/xp";
import { getOrCreateReferralCode, inviteLink, REFERRAL_NEW_USER_XP, referralStats } from "@/features/referrals/service";
import { AvatarPicker } from "@/features/profile/components/avatar-picker";
import { GenderSettings } from "@/features/profile/components/gender-settings";
import { PasswordDialog } from "@/features/profile/components/password-dialog";
import { BioForm } from "@/features/profile/components/bio-form";
import { SoundSwitch } from "@/components/sound-toggle";
import { InterestsForm } from "@/features/profile/components/interests-form";
import { getUpcomingSubjects } from "@/features/learn/queries";
import { InviteBox } from "@/features/referrals/components/invite-box";

export default async function SettingsPage({ params }: PageProps<"/[locale]/settings">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("settings");
  const tp = await getTranslations("plans");
  const { user, tenant } = await requireSession();
  const plan = effectivePlan(user);
  const unlocked = user.level >= AVATAR_UNLOCK_LEVEL;

  const [code, stats, upcoming] = await Promise.all([
    getOrCreateReferralCode(user.id),
    referralStats(user.id),
    getUpcomingSubjects(tenant.id, locale),
  ]);
  const link = await inviteLink(code);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-6 2xl:grid-cols-2">
        {/* Avatar */}
        <Card title={t("avatar")}>
          <div className="mb-5 flex items-center gap-4">
            <Avatar user={user} className="size-20" />
            {!unlocked && (
              <p className="flex items-start gap-2 rounded-xl bg-xp/10 p-3 text-sm text-foreground">
                <Lock className="mt-0.5 size-4 shrink-0 text-xp" />
                {t("avatarLocked", { level: AVATAR_UNLOCK_LEVEL, current: user.level })}
              </p>
            )}
          </div>
          <AvatarPicker seed={user.avatarSeed} style={user.avatarStyle} gender={user.gender} unlocked={unlocked} plan={plan} />
          <div className="mt-6 border-t border-border pt-5" id="gender">
            <GenderSettings seed={user.avatarSeed} style={user.avatarStyle} gender={user.gender} />
          </div>
        </Card>

        {/* Interests */}
        <Card title={t("interests")} id="interests">
          <p className="mb-4 text-sm leading-relaxed text-muted">{t("interestsText")}</p>
          <InterestsForm initial={user.interests} upcoming={upcoming} variant="settings" />
        </Card>

        {/* Bio */}
        <Card title={t("bio")}>
          <BioForm bio={user.bio ?? ""} />
        </Card>

        {/* Invite */}
        <Card title={t("inviteTitle")} id="invite" icon={<Gift className="size-5" />}>
          <p className="mb-4 text-sm leading-relaxed text-muted">
            {t("inviteText", { bonus: REFERRAL_NEW_USER_XP, level: REFERRAL_REWARD_LEVEL, xp: REFERRAL_INVITER_XP })}
          </p>
          <InviteBox code={code} link={link} />
          <p className="mt-3 text-xs text-muted">{t("inviteStats", stats)}</p>
        </Card>

        {/* Password */}
        <Card title={t("password")} id="password">
          <p className="mb-4 text-sm leading-relaxed text-muted">{t("passwordHint")}</p>
          <PasswordDialog />
        </Card>

        {/* Links */}
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <SoundSwitch label={t("sound")} text={t("soundText")} />
          </div>
          <RowLink href="/plans" icon={<Crown className="size-5" />} gradient="bg-grad-xp" title={t("plan")} text={t("planText", { plan: tp(`names.${plan}`) })} />
          <RowLink href="/settings/devices" icon={<Monitor className="size-5" />} gradient="bg-grad-iq" title={t("devices")} text={t("devicesText")} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, id, icon }: { title: string; children: React.ReactNode; id?: string; icon?: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
        {icon && <span className="grid size-8 place-items-center rounded-lg bg-grad-success text-white">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

function RowLink({ href, icon, gradient, title, text }: { href: string; icon: React.ReactNode; gradient: string; title: string; text: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition hover:border-brand/40">
      <span className={`grid size-11 place-items-center rounded-xl text-white ${gradient}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{text}</span>
      </span>
      <ChevronRight className="size-5 text-muted" />
    </Link>
  );
}

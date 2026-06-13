import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";
import type { MessageTone } from "@/lib/messages";

type SmartAlertProps = {
  title: string;
  description: string;
  tone?: MessageTone;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
};

const alertConfig: Record<
  MessageTone,
  {
    icon: React.ElementType;
    wrapperClass: string;
    iconClass: string;
    titleClass: string;
    actionClass: string;
  }
> = {
  info: {
    icon: Info,
    wrapperClass: "smart-alert-info",
    iconClass: "bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-700",
    titleClass: "text-sky-950",
    actionClass:
      "bg-gradient-to-r from-sky-600 to-cyan-600 text-white hover:from-sky-700 hover:to-cyan-700 focus-visible:shadow-[0_0_0_4px_rgba(8,145,178,0.16)]",
  },
  success: {
    icon: CheckCircle2,
    wrapperClass: "smart-alert-success",
    iconClass: "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700",
    titleClass: "text-emerald-950",
    actionClass:
      "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 focus-visible:shadow-[0_0_0_4px_rgba(5,150,105,0.16)]",
  },
  warning: {
    icon: AlertTriangle,
    wrapperClass: "smart-alert-warning",
    iconClass: "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700",
    titleClass: "text-amber-950",
    actionClass:
      "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 focus-visible:shadow-[0_0_0_4px_rgba(234,88,12,0.18)]",
  },
  danger: {
    icon: XCircle,
    wrapperClass: "smart-alert-danger",
    iconClass: "bg-gradient-to-br from-red-100 to-indigo-100 text-red-700",
    titleClass: "text-red-950",
    actionClass:
      "bg-gradient-to-r from-indigo-600 to-red-600 text-white hover:from-indigo-700 hover:to-red-700 focus-visible:shadow-[0_0_0_4px_rgba(225,29,72,0.16)]",
  },
};

export function SmartAlert({
  title,
  description,
  tone = "info",
  actionLabel,
  actionHref,
  className,
}: SmartAlertProps) {
  const config = alertConfig[tone];
  const Icon = config.icon;

  return (
    <section
      className={[
        "smart-alert",
        config.wrapperClass,
        className ?? "",
      ].join(" ")}
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      aria-live={tone === "danger" ? "assertive" : "polite"}
    >
      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          config.iconClass,
        ].join(" ")}
      >
        <Icon size={21} />
      </div>

      <div className="min-w-0 flex-1">
        <h3
          className={[
            "text-base font-extrabold leading-7",
            config.titleClass,
          ].join(" ")}
        >
          {title}
        </h3>

        <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
          {description}
        </p>

        {actionLabel && actionHref ? (
          <div className="mt-4">
            <Link
              href={actionHref}
              className={[
                "inline-flex min-h-10 items-center justify-center rounded-2xl px-4 text-sm font-extrabold transition shadow-sm",
                config.actionClass,
              ].join(" ")}
            >
              {actionLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

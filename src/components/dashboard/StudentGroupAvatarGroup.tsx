import Avatar from "@mui/material/Avatar";
import { styled } from "@mui/material/styles";
import { type ReactNode, useState } from "react";

import { SignedAvatarImg } from "@/components/common/SignedAvatar";
import { compareStudentProfilesBySurnameThenName } from "@/lib/student-sort";

type GroupMember = {
  user_id: string;
  profile: {
    ad: string | null;
    soyad: string | null;
    avatar_url: string | null;
  } | null;
};

const AVATAR_SIZE = 32;
const OVERLAP = "-8px";
const SPREAD = "3px";
const TRANSITION = "margin-left 220ms ease, max-width 220ms ease, opacity 200ms ease";

const GroupAvatar = styled(Avatar)(() => ({
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  fontSize: 10.5,
  fontWeight: 700,
  border: "2.5px solid color-mix(in oklch, var(--card) 76%, var(--primary) 24%)",
  boxShadow: "0 0 0 1px color-mix(in oklch, var(--border) 72%, transparent)",
  boxSizing: "border-box",
  flexShrink: 0,
  position: "relative",
  transition: TRANSITION,
  backgroundColor: "var(--portal-maroon, #6E1A2C)",
  color: "white",
}));

function initials(ad?: string | null, soyad?: string | null) {
  const parts = [ad, soyad].filter(Boolean) as string[];
  if (parts.length === 0) return "?";
  return parts.map((part) => part.trim().charAt(0)).filter(Boolean).join("").toUpperCase() || "?";
}

function displayName(member: GroupMember) {
  return [member.profile?.ad, member.profile?.soyad].filter(Boolean).join(" ").trim() || "Qrup üzvü";
}

/**
 * Student dashboard group avatars.
 * Collapsed: 6 profiles + +N.
 * Expanded: all profiles wrap inside the available width instead of expanding
 * the parent panel horizontally.
 */
export function StudentGroupAvatarGroup({
  members,
  max = 6,
  renderFallback,
}: {
  members: GroupMember[];
  max?: number;
  renderFallback?: (member: GroupMember) => ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const orderedMembers = [...members].sort((a, b) =>
    compareStudentProfilesBySurnameThenName(a.profile, b.profile),
  );

  if (orderedMembers.length === 0) return null;

  const total = orderedMembers.length;
  const visibleSlots = Math.max(1, max);
  const hasOverflow = total > visibleSlots;
  const overflowCount = total - visibleSlots;
  const visibleMembers = expanded ? orderedMembers : orderedMembers.slice(0, visibleSlots);

  return (
    <div
      className="flex w-full min-w-0 max-w-full flex-wrap items-center overflow-visible"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
    >
      {visibleMembers.map((member, index) => {
        const profile = member.profile;
        const name = displayName(member);
        const fallback = renderFallback ? renderFallback(member) : initials(profile?.ad, profile?.soyad);

        return (
          <GroupAvatar
            key={member.user_id}
            alt={name}
            title={name}
            tabIndex={0}
            src={undefined}
            sx={{
              zIndex: expanded ? total - index + 100 : total - index,
              marginLeft: index === 0 ? 0 : expanded ? SPREAD : OVERLAP,
              marginTop: expanded ? "2px" : 0,
              marginBottom: expanded ? "2px" : 0,
            }}
          >
            {profile?.avatar_url ? (
              <SignedAvatarImg src={profile.avatar_url} alt={name} className="size-full object-cover" />
            ) : (
              fallback
            )}
          </GroupAvatar>
        );
      })}

      {hasOverflow && !expanded && (
        <GroupAvatar
          title={`+${overflowCount} əlavə üzv`}
          aria-label={`+${overflowCount} əlavə üzv`}
          sx={{
            marginLeft: OVERLAP,
            zIndex: total + 1000,
            position: "relative",
            display: "flex",
            visibility: "visible",
            opacity: 1,
            width: AVATAR_SIZE,
            minWidth: AVATAR_SIZE,
            maxWidth: AVATAR_SIZE,
            height: AVATAR_SIZE,
            overflow: "visible",
            backgroundColor: "var(--portal-maroon, #6E1A2C)",
            color: "white",
          }}
        >
          +{overflowCount}
        </GroupAvatar>
      )}
    </div>
  );
}

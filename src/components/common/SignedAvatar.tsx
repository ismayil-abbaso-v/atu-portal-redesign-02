// Private "avatars" bucket-i üçün imzalanmış URL ilə şəkil göstərən köməkçilər.
import { AvatarImage } from "@/components/ui/avatar";
import { useAvatarUrl } from "@/lib/avatar-url";

export function SignedAvatarImage({
  src,
  alt,
  className,
}: {
  src?: string | null | undefined;
  alt?: string;
  className?: string;
}) {
  const url = useAvatarUrl(src);
  if (!url) return null;
  return <AvatarImage src={url} alt={alt} className={className} />;
}

export function SignedAvatarImg({
  src,
  alt,
  className,
}: {
  src?: string | null | undefined;
  alt?: string;
  className?: string;
}) {
  const url = useAvatarUrl(src);
  if (!url) return null;
  return <img src={url} alt={alt ?? ""} className={className} />;
}

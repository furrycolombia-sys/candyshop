import { tid } from "shared";

interface AuthorAvatarProps {
  name: string;
}

export function AuthorAvatar({ name }: AuthorAvatarProps) {
  return (
    <div
      className="size-10 rounded-full border-[3px] border-foreground bg-(--lilac) flex items-center justify-center shrink-0"
      {...tid(`author-avatar-${name}`)}
    >
      <span className="font-display text-sm font-extrabold uppercase">
        {name[0] ?? "?"}
      </span>
    </div>
  );
}

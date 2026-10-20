import { splitName } from "@/lib/names";

export default function NameText({ name }: { name: string }) {
  const parts = splitName(name);
  if (!parts.id) return <>{parts.base}</>;
  return (
    <>
      {parts.base}
      <em>{parts.id}</em>
    </>
  );
}

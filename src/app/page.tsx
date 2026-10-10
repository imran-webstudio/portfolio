import { Experience } from "~/components/experience/Experience";
import { api, HydrateClient } from "~/trpc/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await api.project.list.prefetch();

  return (
    <HydrateClient>
      <Experience />
    </HydrateClient>
  );
}

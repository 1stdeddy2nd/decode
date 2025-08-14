import Link from "next/link";

import { LatestPost } from "~/app/_components/post";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import Button from "./_components/button";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <section className="relative bg-gray-200 overflow-hidden h-screen bg-grid-pattern">
        {/* Background Circles with Random Movement */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply opacity-30 blur-3xl animate-floating-1"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-gray-400 rounded-full mix-blend-multiply opacity-20 blur-2xl animate-floating-2"></div>

        {/* Smaller Animated Circles on both sides */}
        <div className="absolute bottom-10 left-20 w-32 h-32 bg-green-200 rounded-full mix-blend-multiply opacity-40 blur-2xl animate-floating-3"></div>
        <div className="absolute bottom-20 right-40 w-24 h-24 bg-gray-400 rounded-full mix-blend-multiply opacity-30 blur-xl animate-floating-4"></div>
        <div className="absolute top-40 left-40 w-24 h-24 bg-green-200 rounded-full mix-blend-multiply opacity-40 blur-xl animate-floating-4"></div>
        <div className="container mx-auto px-4 h-full flex items-center justify-center flex-col pb-12">
          <h1 className="text-7xl font-semibold mb-5">Decode</h1>
          <p className="text-xl text-gray-600 mb-6 max-w-2xl text-center">
            Convert your designs into production-ready code in seconds with a
            streamlined and collaborative process.
          </p>
          <div className="flex gap-3">
            <Button>Get Started</Button>
            <Button variant="primary-outlined">Learn More</Button>
          </div>
        </div>
      </section>
    </HydrateClient>
  );
}

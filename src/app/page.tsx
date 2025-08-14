import { HydrateClient } from "~/trpc/server";
import Modal from "./_components/modal";
import Table from './_components/table'
import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth()

  return (
    <HydrateClient>
      <section className="relative bg-gray-200 overflow-hidden h-screen bg-grid-pattern">
        {/* Background Circles with Random Movement */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply opacity-30 blur-3xl floating-1"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-gray-400 rounded-full mix-blend-multiply opacity-20 blur-2xl floating-2"></div>

        {/* Smaller Animated Circles on both sides */}
        <div className="absolute bottom-10 left-20 w-32 h-32 bg-green-200 rounded-full mix-blend-multiply opacity-40 blur-2xl floating-3"></div>
        <div className="absolute bottom-20 right-40 w-24 h-24 bg-gray-400 rounded-full mix-blend-multiply opacity-30 blur-xl floating-4"></div>
        <div className="absolute top-40 left-40 w-24 h-24 bg-green-200 rounded-full mix-blend-multiply opacity-40 blur-xl floating-4"></div>
        <div className="container mx-auto px-4 h-full pt-18">
          <div className="flex justify-between gap-4 mb-6 items-center">
            <p className="text-sm text-gray-600 max-w-lg flex-1">
              Easily verify your CV by entering your details, uploading your PDF, and letting AI confirm that everything matches
            </p>
            <Modal isLoggedIn={!!session?.user} />
          </div>
          <div className="relative z-10">
            <Table isLoggedIn={!!session?.user} />
          </div>
        </div>
      </section>
    </HydrateClient>
  );
}

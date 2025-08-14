import "~/styles/globals.css";

import { type Metadata } from "next";
import { Poppins } from 'next/font/google';

import { TRPCReactProvider } from "~/trpc/react";
import Layout from "~/lib/components/layout";
import { Toaster } from "~/components/ui/sonner"


const poppins = Poppins({
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
});


export const metadata: Metadata = {
  title: "Decode",
  description: "AI Platform to Validate CV",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <TRPCReactProvider>
          <Toaster />
          <Layout>
            {children}
          </Layout>
        </TRPCReactProvider>
      </body>
    </html>
  );
}

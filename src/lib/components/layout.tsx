import { auth } from "~/server/auth";
import Header from "./header";

interface Props {
    children: React.ReactNode
}

export default async function Layout({ children }: Props) {
    const session = await auth();

    return (
        <main>
            <Header name={session?.user?.name} />
            {children}
        </main>
    )
}
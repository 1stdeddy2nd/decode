"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";

// ⬇️ Replace this with your actual tRPC client path
import { api } from "~/trpc/react";

// shadcn/ui components
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "~/components/ui/alert-dialog";
import { Loader2, MoreHorizontal, Trash2, FileDown, RefreshCw } from "lucide-react";
import MismatchDialog from "./mismatch-dialog";

// ===== Types =====
export type CVStatus = "PENDING" | "PASSED" | "FAILED";

export type Mismatch = {
    field: string;
    expected?: unknown;
    actual?: unknown;
    message: string;
};

export type CVItem = {
    id: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    fullName: string;
    email: string;
    phone: string;
    status: CVStatus;
    score: number | null;
    skills: string[];
    pdfPath: string | null;
    mismatches: Mismatch[];
};

export type PageInfo = {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
};

// ===== Small utils =====
function useDebouncedValue<T>(value: T, delay = 400) {
    const [debounced, setDebounced] = React.useState(value);
    React.useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

function StatusBadge({ status }: { status: CVStatus }) {
    const variant =
        status === "PASSED" ? "default" : status === "FAILED" ? "destructive" : "secondary";
    return <Badge variant={variant}>{status}</Badge>;
}

// ===== Main component =====
interface Props {
    isLoggedIn: boolean
}

export default function CvSubmissionTable({ isLoggedIn }: Props) {

    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(10);
    const [search, setSearch] = React.useState("");
    const [status, setStatus] = React.useState<CVStatus | undefined>(undefined);

    const debouncedSearch = useDebouncedValue(search, 400);

    const query = api.cv.list.useQuery(
        { page, pageSize, search: debouncedSearch || undefined, status },
        {
            placeholderData: (prev) => prev,
            refetchOnWindowFocus: false,
            retry: 1,
            enabled: isLoggedIn
        }
    );

    const utils = api.useUtils();
    const deleteMutation = api.cv.delete.useMutation({
        onSuccess: async () => {
            await utils.cv.list.invalidate();
        },
    });

    const items: CVItem[] = query.data?.items ?? [];
    const pageInfo: PageInfo | undefined = query.data?.pageInfo;

    const isLoading = query.isLoading || query.isFetching;

    return (
        <Card className="w-full z-[10]">
            <CardHeader className="gap-2">
                <CardTitle>CV Submissions</CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex w-full gap-2 sm:max-w-md">
                        <Input
                            placeholder="Search name or email..."
                            value={search}
                            onChange={(e) => {
                                setPage(1);
                                setSearch(e.target.value);
                            }}
                        />
                        <Select
                            value={status ?? "ALL"}
                            onValueChange={(v) => {
                                setPage(1);
                                setStatus(v === "ALL" ? undefined : (v as CVStatus));
                            }}
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="PASSED">Passed</SelectItem>
                                <SelectItem value="FAILED">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Select
                            value={String(pageSize)}
                            onValueChange={(v) => {
                                setPage(1);
                                setPageSize(Number(v));
                            }}
                        >
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Page size" />
                            </SelectTrigger>
                            <SelectContent>
                                {[10, 20, 50, 100].map((n) => (
                                    <SelectItem key={n} value={String(n)}>
                                        {n} / page
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="icon" onClick={() => query.refetch()} disabled={isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[170px]">Submitted</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="hidden lg:table-cell">Phone</TableHead>
                                <TableHead>Skills</TableHead>
                                {/* <TableHead className="w-[100px]">Score</TableHead> */}
                                <TableHead className="w-[110px]">Status</TableHead>
                                <TableHead className="w-[70px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-24 text-center text-sm text-muted-foreground"
                                    >
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : items.length > 0 ? (
                                items.map((it) => (
                                    <TableRow key={it.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {format(new Date(it.createdAt), "PP p")}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Updated {format(new Date(it.updatedAt), "PP p")}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{it.fullName}</TableCell>
                                        <TableCell>
                                            <a
                                                href={`mailto:${it.email}`}
                                                className="underline-offset-4 hover:underline"
                                            >
                                                {it.email}
                                            </a>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell">{it.phone}</TableCell>
                                        <TableCell>
                                            <div className="flex max-w-[320px] flex-wrap gap-1">
                                                {it.skills?.slice(0, 6).map((s, idx) => (
                                                    <Badge key={idx} variant="outline" className="font-normal">
                                                        {s}
                                                    </Badge>
                                                ))}
                                                {it.skills && it.skills.length > 6 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        +{it.skills.length - 6} more
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        {/* <TableCell>{it.score ?? "—"}</TableCell> */}
                                        <TableCell>
                                            <StatusBadge status={it.status} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <MismatchDialog mismatches={it.mismatches ?? []} />
                                            <RowActions
                                                item={it}
                                                onDelete={async () => {
                                                    await deleteMutation.mutateAsync({ id: it.id });
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="h-24 text-center text-sm text-muted-foreground"
                                    >
                                        No submissions found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">
                        {pageInfo ? (
                            <span>
                                Page <span className="font-medium">{pageInfo.page}</span> of {pageInfo.totalPages} •
                                {' '}<span className="font-medium">{pageInfo.totalItems}</span> total
                            </span>
                        ) : (
                            <span>—</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={!pageInfo?.hasPrevPage || isLoading}
                        >
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => (pageInfo?.hasNextPage ? p + 1 : p))}
                            disabled={!pageInfo?.hasNextPage || isLoading}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function RowActions({ item, onDelete }: { item: CVItem; onDelete: () => Promise<void> }) {
    const [openConfirm, setOpenConfirm] = React.useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open actions</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {item.pdfPath && (
                        <DropdownMenuItem asChild>
                            <Link href={item.pdfPath} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2">
                                <FileDown className="h-4 w-4" />
                                <span>Open PDF</span>
                            </Link>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpenConfirm(true); }} className="text-red-600 focus:text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={openConfirm} onOpenChange={setOpenConfirm}>
                <AlertDialogTrigger asChild>
                    <span />
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete submission?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The submission <span className="font-medium">{item.fullName}</span> will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={async () => {
                                await onDelete();
                                setOpenConfirm(false);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
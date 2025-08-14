import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import type { Mismatch } from "./table";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

function isPrimitive(v: unknown) {
  return v === null || ["string", "number", "boolean"].includes(typeof v);
}

function renderValue(v: unknown) {
  if (isPrimitive(v)) return <span className="break-words">{String(v)}</span>;
  if (Array.isArray(v)) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        {v.map((x, i) => <li key={i} className="break-words">{isPrimitive(x) ? String(x) : JSON.stringify(x)}</li>)}
      </ul>
    );
  }
  return (
    <pre className="rounded bg-muted/50 p-2 text-xs overflow-x-auto">
      {JSON.stringify(v, null, 2)}
    </pre>
  );
}

export default function MismatchDialog({ mismatches }: { mismatches: Mismatch[] }) {
  const filterMismatches = mismatches.filter((m) => m.message !== 'Match')
  const hasIssues = filterMismatches?.length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={hasIssues ? "destructive" : "secondary"} size="sm">
          {hasIssues ? <AlertTriangle className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
          {hasIssues ? `${filterMismatches.length} issue${filterMismatches.length > 1 ? "s" : ""}` : "No issues"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            AI Validation
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-2">
          {!hasIssues ? (
            <div className="text-sm text-muted-foreground">No mismatches. All fields match the PDF.</div>
          ) : (
            <div className="space-y-4">
              {filterMismatches.map((m, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="font-medium mb-2">{m.field}</div>
                  <Badge variant="outline" className="text-xs mb-2">{m.message}</Badge>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-xs uppercase text-muted-foreground">Expected</div>
                      {renderValue(m.expected)}
                    </div>
                    <div>
                      <div className="mb-1 text-xs uppercase text-muted-foreground">Actual</div>
                      {renderValue(m.actual)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

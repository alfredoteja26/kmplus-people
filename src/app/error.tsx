"use client";

import { useEffect } from "react";
import { Button } from "@/components/coss/button";
import { Card, PageColumn } from "@/components/product/Card";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageColumn className="max-w-xl pt-6">
      <Card className="p-6 sm:p-8">
        <div role="alert">
          <h1 className="m-0 text-[22px] font-medium leading-tight">This page didn’t load</h1>
          <p className="mt-2 mb-6 text-muted">
            Something went wrong while showing it. Your saved work is not affected. Try again, and if it keeps happening,
            tell the KMPlus People admin{error.digest ? ` and mention reference ${error.digest}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="outline" type="button" onClick={() => (window.location.href = "/")}>
            Go to Home
          </Button>
        </div>
      </Card>
    </PageColumn>
  );
}

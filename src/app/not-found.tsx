import Link from "next/link";
import { Button } from "@/components/coss/button";
import { Card, PageColumn } from "@/components/product/Card";

export const metadata = { title: { absolute: "Page not found · KMPlus People" } };

export default function NotFound() {
  return (
    <PageColumn className="max-w-xl pt-6">
      <Card className="p-6 sm:p-8">
        <h1 className="m-0 text-[22px] font-medium leading-tight">We can’t find that page</h1>
        <p className="mt-2 mb-6 text-muted">
          The link may be old, or the record may have been removed. Check the address, or go back to Home.
        </p>
        <Button render={<Link href="/" />}>Go to Home</Button>
      </Card>
    </PageColumn>
  );
}

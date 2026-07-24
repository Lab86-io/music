import * as React from "react";
import { Skeleton as AstryxSkeleton } from "@astryxdesign/core/Skeleton";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <AstryxSkeleton className={className} {...props} />;
}

export { Skeleton };

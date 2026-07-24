"use client";

import * as React from "react";
import { VStack } from "@astryxdesign/core/Stack";

function ScrollArea({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <VStack isScrollable className={className} {...props}>
      {children}
    </VStack>
  );
}

export { ScrollArea };

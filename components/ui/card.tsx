import * as React from "react";
import { Card as AstryxCard } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

function Card({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <AstryxCard padding={0} className={className} {...props}>
      {children}
    </AstryxCard>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <VStack as="header" gap={2} padding={4} className={className} {...props} />;
}

function CardTitle({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Heading level={3} className={className}>
      {children}
    </Heading>
  );
}

function CardDescription({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Text as="p" type="supporting" className={className}>
      {children}
    </Text>
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <StackItem crossAlignSelf="end" className={className} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <VStack gap={0} paddingInline={4} paddingBlock={3} className={className} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"footer">) {
  return <HStack as="footer" gap={2} padding={4} className={className} {...props} />;
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};

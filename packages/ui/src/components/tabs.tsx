"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@ui/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "inline-flex items-center justify-center gap-0.5",
  {
    variants: {
      variant: {
        default: "bg-muted h-8 w-fit rounded-md p-0.5",
        folder:
          "relative flex w-full h-auto rounded-none bg-transparent p-0 gap-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {variant === "folder" && (
        <div className="absolute bottom-0 inset-x-0 h-px bg-border" />
      )}
      {children}
    </TabsPrimitive.List>
  );
}

const tabsTriggerVariants = cva(
  [
    "inline-flex items-center justify-center text-sm font-medium transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default: [
          "rounded-sm px-3 py-1",
          "text-muted-foreground hover:text-foreground",
          "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border",
        ],
        folder: [
          "relative flex-1 gap-2 px-4 py-2.5",
          "rounded-t-lg rounded-b-none border border-transparent",
          "bg-transparent text-muted-foreground shadow-none",
          "hover:bg-muted/50 hover:text-foreground",
          "data-[state=active]:bg-background data-[state=active]:border-border",
          "data-[state=active]:border-b-background data-[state=active]:text-foreground",
          "data-[state=active]:shadow-sm data-[state=active]:z-10",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsTrigger({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> &
  VariantProps<typeof tabsTriggerVariants>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export {
  Tabs,
  TabsList,
  tabsListVariants,
  TabsTrigger,
  tabsTriggerVariants,
  TabsContent,
};

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
declare function Popover({ ...props }: PopoverPrimitive.Root.Props): import("react/jsx-runtime").JSX.Element;
declare const PopoverTrigger: PopoverPrimitive.Trigger;
declare const PopoverContent: React.ForwardRefExoticComponent<Omit<import("@base-ui/react").PopoverPopupProps & Pick<import("@base-ui/react").PopoverPositionerProps, "align" | "alignOffset" | "side" | "sideOffset">, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function PopoverTitle({ className, ...props }: React.ComponentProps<'p'>): import("react/jsx-runtime").JSX.Element;
declare function PopoverDescription({ className, ...props }: React.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
export { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription };

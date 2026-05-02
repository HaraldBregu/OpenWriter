import * as React from 'react';
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { type VariantProps } from 'class-variance-authority';
declare function Sheet({ ...props }: SheetPrimitive.Root.Props): import("react/jsx-runtime").JSX.Element;
declare const SheetTrigger: SheetPrimitive.Trigger;
declare const SheetClose: React.ForwardRefExoticComponent<Omit<import("@base-ui/react").AlertDialogCloseProps, "ref"> & React.RefAttributes<HTMLButtonElement>>;
declare const SheetPortal: React.ForwardRefExoticComponent<Omit<import("@base-ui/react").AlertDialogPortalProps, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SheetOverlay: React.ForwardRefExoticComponent<Omit<import("@base-ui/react").AlertDialogBackdropProps, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const sheetVariants: (props?: ({
    side?: "top" | "bottom" | "left" | "right" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
interface SheetContentProps extends SheetPrimitive.Popup.Props, VariantProps<typeof sheetVariants> {
}
declare const SheetContent: React.ForwardRefExoticComponent<Omit<SheetContentProps, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const SheetHeader: {
    ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
declare const SheetFooter: {
    ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
declare const SheetTitle: React.ForwardRefExoticComponent<Omit<import("@base-ui/react").AlertDialogTitleProps, "ref"> & React.RefAttributes<HTMLHeadingElement>>;
declare const SheetDescription: React.ForwardRefExoticComponent<Omit<import("@base-ui/react").AlertDialogDescriptionProps, "ref"> & React.RefAttributes<HTMLParagraphElement>>;
export { Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, };

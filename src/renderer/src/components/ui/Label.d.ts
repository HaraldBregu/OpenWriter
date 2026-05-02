import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';
declare const labelVariants: (props?: import("class-variance-authority/types").ClassProp | undefined) => string;
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement>, VariantProps<typeof labelVariants> {
}
declare const Label: React.ForwardRefExoticComponent<LabelProps & React.RefAttributes<HTMLLabelElement>>;
export { Label };

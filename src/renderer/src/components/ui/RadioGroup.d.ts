import * as React from 'react';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import { Radio as RadioPrimitive } from '@base-ui/react/radio';
declare const RadioGroup: React.ForwardRefExoticComponent<Omit<RadioGroupPrimitive.Props<any>, "ref"> & React.RefAttributes<HTMLDivElement>>;
declare const RadioGroupItem: React.ForwardRefExoticComponent<Omit<RadioPrimitive.Root.Props<string>, "ref"> & React.RefAttributes<HTMLSpanElement>>;
export { RadioGroup, RadioGroupItem };

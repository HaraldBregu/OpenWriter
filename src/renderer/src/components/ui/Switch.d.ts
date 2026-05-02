import * as React from 'react';
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
export interface SwitchProps extends SwitchPrimitive.Root.Props {
}
declare const Switch: React.ForwardRefExoticComponent<Omit<SwitchProps, "ref"> & React.RefAttributes<HTMLElement>>;
export { Switch };
